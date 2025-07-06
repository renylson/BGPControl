"""
Serviço para operações de backup e restore do banco PostgreSQL
"""
import os
import asyncio
import subprocess
import shutil
import tempfile
import gzip
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4
from pathlib import Path

from fastapi import UploadFile
from app.core.config import DATABASE_URL
from app.schemas.database_backup import BackupInfo, BackupStatus
import logging

logger = logging.getLogger(__name__)

class DatabaseBackupService:
    def __init__(self):
        self.backup_dir = Path("/var/backups/bgpcontrol")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Caminhos completos para os comandos PostgreSQL
        self.pg_dump_path = '/usr/bin/pg_dump'
        self.psql_path = '/usr/bin/psql'
        
        # Verificar se os comandos existem
        if not os.path.exists(self.pg_dump_path):
            raise Exception(f"pg_dump não encontrado em {self.pg_dump_path}")
        if not os.path.exists(self.psql_path):
            raise Exception(f"psql não encontrado em {self.psql_path}")
        
        # Extrair configurações do DATABASE_URL
        self._parse_database_url()
    
    def _parse_database_url(self):
        """Extrai informações de conexão da DATABASE_URL"""
        # Exemplo: postgresql+asyncpg://bgpcontrol:Vls%40021130@localhost/bgpcontrol
        url = DATABASE_URL.replace('postgresql+asyncpg://', '')
        
        if '@' in url:
            auth, host_db = url.split('@')
            if ':' in auth:
                self.db_user, password = auth.split(':')
                # Decodificar URL encoding
                self.db_password = password.replace('%40', '@')
            else:
                self.db_user = auth
                self.db_password = ''
        else:
            raise ValueError("URL do banco de dados inválida")
        
        if '/' in host_db:
            host_port, self.db_name = host_db.split('/')
        else:
            raise ValueError("Nome do banco não encontrado na URL")
        
        if ':' in host_port:
            self.db_host, self.db_port = host_port.split(':')
        else:
            self.db_host = host_port
            self.db_port = '5432'
    
    def _format_size(self, size_bytes: int) -> str:
        """Formata tamanho em bytes para formato legível"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    async def create_backup(self, created_by: str, description: Optional[str] = None) -> BackupInfo:
        """Cria um backup do banco de dados com compactação"""
        backup_id = str(uuid4())
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}_{backup_id}.sql.gz"  # Arquivo compactado
        backup_path = self.backup_dir / filename
        temp_sql_path = self.backup_dir / f"temp_{backup_id}.sql"  # Arquivo temporário
        
        logger.info(f"Iniciando criação de backup: {filename}")
        logger.info(f"Caminho do backup: {backup_path}")
        
        # Verificar se diretório existe e é gravável
        if not self.backup_dir.exists():
            logger.error(f"Diretório de backup não existe: {self.backup_dir}")
            raise Exception(f"Diretório de backup não existe: {self.backup_dir}")
        
        if not os.access(self.backup_dir, os.W_OK):
            logger.error(f"Sem permissão de escrita no diretório: {self.backup_dir}")
            raise Exception(f"Sem permissão de escrita no diretório: {self.backup_dir}")
        
        # Comando pg_dump (primeiro para arquivo temporário)
        # Usar caminho completo para garantir que seja encontrado pelo systemd
        cmd = [
            self.pg_dump_path,
            '-h', self.db_host,
            '-p', self.db_port,
            '-U', self.db_user,
            '-d', self.db_name,
            '--no-password',
            '--verbose',
            '--clean',
            '--create',
            '--if-exists',
            '-f', str(temp_sql_path)
        ]
        
        logger.info(f"Comando pg_dump: {' '.join(cmd)}")
        logger.info(f"Variável de ambiente PGPASSWORD definida: {'Sim' if self.db_password else 'Não'}")
        logger.info(f"Usuário atual: {os.getuid()}")
        logger.info(f"Diretório de trabalho: {os.getcwd()}")
        
        # Definir senha via variável de ambiente
        env = os.environ.copy()
        env['PGPASSWORD'] = self.db_password
        
        try:
            # Executar pg_dump
            logger.info("Executando pg_dump...")
            process = await asyncio.create_subprocess_exec(
                *cmd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.backup_dir)  # Definir diretório de trabalho
            )
            
            stdout, stderr = await process.communicate()
            
            logger.info(f"pg_dump retornou código: {process.returncode}")
            if stdout:
                logger.info(f"pg_dump stdout: {stdout.decode()}")
            if stderr:
                logger.info(f"pg_dump stderr: {stderr.decode()}")
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Erro desconhecido no pg_dump"
                logger.error(f"Erro no backup: {error_msg}")
                raise Exception(f"Falha no pg_dump (código {process.returncode}): {error_msg}")
            
            # Verificar se arquivo temporário foi criado
            if not temp_sql_path.exists():
                logger.error(f"Arquivo temporário não foi criado: {temp_sql_path}")
                raise Exception(f"Arquivo temporário não foi criado: {temp_sql_path}")
            
            # Compactar arquivo
            logger.info("Compactando arquivo de backup...")
            with open(temp_sql_path, 'rb') as f_in:
                with gzip.open(backup_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remover arquivo temporário
            temp_sql_path.unlink()
            logger.info("Arquivo temporário removido")
            
            # Verificar se arquivo compactado foi criado
            if not backup_path.exists():
                logger.error(f"Arquivo de backup compactado não foi criado: {backup_path}")
                raise Exception(f"Arquivo de backup compactado não foi criado: {backup_path}")
        
        except FileNotFoundError as e:
            logger.error(f"Arquivo ou comando não encontrado: {e}")
            raise Exception(f"Comando pg_dump não encontrado ou arquivo inacessível: {e}")
        except PermissionError as e:
            logger.error(f"Erro de permissão: {e}")
            raise Exception(f"Erro de permissão ao acessar arquivo ou diretório: {e}")
        except Exception as e:
            logger.error(f"Erro inesperado durante backup: {e}")
            # Limpar arquivo temporário se existir
            if temp_sql_path.exists():
                try:
                    temp_sql_path.unlink()
                    logger.info("Arquivo temporário removido após erro")
                except Exception as cleanup_error:
                    logger.error(f"Erro ao limpar arquivo temporário: {cleanup_error}")
            raise Exception(f"Erro durante criação do backup: {e}")
            
            # Obter informações do arquivo compactado
            file_stat = backup_path.stat()
            logger.info(f"Backup criado e compactado com sucesso. Tamanho: {file_stat.st_size} bytes")
            
            # Criar metadados do backup
            backup_info = BackupInfo(
                id=backup_id,
                filename=filename,
                created_at=datetime.now(),
                created_by=created_by,
                size_bytes=file_stat.st_size,
                size_human=self._format_size(file_stat.st_size),
                description=description
            )
            
            logger.info(f"Backup criado com sucesso: {filename}")
            return backup_info
            
        except Exception as e:
            logger.error(f"Erro na criação do backup: {e}")
            # Limpar arquivos parciais se existirem
            if backup_path.exists():
                backup_path.unlink()
                logger.info(f"Arquivo parcial removido: {backup_path}")
            if temp_sql_path.exists():
                temp_sql_path.unlink()
                logger.info(f"Arquivo temporário removido: {temp_sql_path}")
            raise e
    
    async def list_backups(self) -> List[BackupInfo]:
        """Lista todos os backups disponíveis (SQL e SQL.GZ)"""
        backups = []
        
        # Buscar por arquivos .sql e .sql.gz
        patterns = ["backup_*.sql", "backup_*.sql.gz"]
        
        for pattern in patterns:
            for backup_file in self.backup_dir.glob(pattern):
                try:
                    # Extrair ID do nome do arquivo
                    filename = backup_file.name
                    
                    # Remover extensão (.sql ou .sql.gz)
                    if filename.endswith('.sql.gz'):
                        base_name = filename.replace('.sql.gz', '')
                    else:
                        base_name = filename.replace('.sql', '')
                    
                    if '_' in base_name:
                        parts = base_name.split('_')
                        if len(parts) >= 3:
                            backup_id = parts[-1]  # Último parte é o UUID
                            timestamp_str = f"{parts[1]}_{parts[2]}"
                            
                            # Converter timestamp
                            created_at = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                            
                            # Informações do arquivo
                            file_stat = backup_file.stat()
                            
                            backup_info = BackupInfo(
                                id=backup_id,
                                filename=filename,
                                created_at=created_at,
                                created_by="Sistema",  # Por enquanto, podemos melhorar isso
                                size_bytes=file_stat.st_size,
                                size_human=self._format_size(file_stat.st_size)
                            )
                            
                            backups.append(backup_info)
                except Exception as e:
                    logger.warning(f"Erro ao processar backup {backup_file}: {e}")
                    continue
        
        # Ordenar por data de criação (mais recente primeiro)
        backups.sort(key=lambda x: x.created_at, reverse=True)
        return backups
    
    async def get_backup_path(self, backup_id: str) -> str:
        """Retorna o caminho completo de um backup (SQL ou SQL.GZ)"""
        # Procurar por arquivos .sql.gz primeiro, depois .sql
        patterns = [f"backup_*{backup_id}.sql.gz", f"backup_*{backup_id}.sql"]
        
        for pattern in patterns:
            for backup_file in self.backup_dir.glob(pattern):
                if backup_id in backup_file.name:
                    return str(backup_file)
        
        raise FileNotFoundError(f"Backup {backup_id} não encontrado")
    
    async def restore_backup(self, backup_id: str, confirm_replace: bool, restored_by: str) -> bool:
        """Restaura o banco de dados a partir de um backup"""
        if not confirm_replace:
            raise ValueError("Confirmação necessária para substituir dados existentes")
        
        backup_path = await self.get_backup_path(backup_id)
        
        if not os.path.exists(backup_path):
            raise FileNotFoundError("Arquivo de backup não encontrado")
        
        return await self._execute_restore(backup_path, restored_by)
    
    async def restore_from_upload(self, file: UploadFile, confirm_replace: bool, restored_by: str) -> bool:
        """Restaura banco a partir de arquivo enviado"""
        if not confirm_replace:
            raise ValueError("Confirmação necessária para substituir dados existentes")
        
        # Salvar arquivo temporariamente
        with tempfile.NamedTemporaryFile(delete=False, suffix='.sql') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            return await self._execute_restore(temp_path, restored_by)
        finally:
            # Limpar arquivo temporário
            os.unlink(temp_path)
    
    async def _execute_restore(self, backup_path: str, restored_by: str) -> bool:
        """Executa a restauração do banco"""
        temp_sql_path = None
        
        try:
            # Se o arquivo está compactado, descompactar primeiro
            if backup_path.endswith('.gz'):
                logger.info("Descompactando arquivo de backup...")
                temp_sql_path = backup_path.replace('.gz', '.temp')
                
                with gzip.open(backup_path, 'rb') as f_in:
                    with open(temp_sql_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                
                restore_file_path = temp_sql_path
                logger.info(f"Arquivo descompactado para: {restore_file_path}")
            else:
                restore_file_path = backup_path
            
            # Comando psql para restaurar
            # Usar caminho completo para garantir que seja encontrado pelo systemd
            cmd = [
                self.psql_path,
                '-h', self.db_host,
                '-p', self.db_port,
                '-U', self.db_user,
                '-d', 'postgres',  # Conectar ao banco postgres para recriar o banco
                '--no-password',
                '-f', restore_file_path
            ]
            
            # Definir senha via variável de ambiente
            env = os.environ.copy()
            env['PGPASSWORD'] = self.db_password
            
            logger.info(f"Executando restauração com comando: {' '.join(cmd)}")
            
            # Executar psql
            process = await asyncio.create_subprocess_exec(
                *cmd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Erro desconhecido no psql"
                logger.error(f"Erro na restauração: {error_msg}")
                raise Exception(f"Falha na restauração: {error_msg}")
            
            logger.info(f"Restauração concluída com sucesso por {restored_by}")
            return True
            
        except Exception as e:
            logger.error(f"Erro na restauração: {e}")
            raise e
        finally:
            # Limpar arquivo temporário se foi criado
            if temp_sql_path and os.path.exists(temp_sql_path):
                os.unlink(temp_sql_path)
                logger.info("Arquivo temporário de restauração removido")
    
    async def delete_backup(self, backup_id: str, deleted_by: str) -> bool:
        """Remove um backup específico"""
        try:
            backup_path = await self.get_backup_path(backup_id)
            os.unlink(backup_path)
            logger.info(f"Backup {backup_id} removido por {deleted_by}")
            return True
        except FileNotFoundError:
            return False
    
    async def cleanup_old_backups(self, days_to_keep: int, cleaned_by: str) -> int:
        """Remove backups antigos"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        removed_count = 0
        
        for backup_file in self.backup_dir.glob("backup_*.sql"):
            try:
                file_stat = backup_file.stat()
                file_date = datetime.fromtimestamp(file_stat.st_mtime)
                
                if file_date < cutoff_date:
                    backup_file.unlink()
                    removed_count += 1
                    logger.info(f"Backup antigo removido: {backup_file.name}")
            except Exception as e:
                logger.warning(f"Erro ao remover backup {backup_file}: {e}")
        
        logger.info(f"Limpeza concluída por {cleaned_by}: {removed_count} backups removidos")
        return removed_count
    
    async def get_backup_status(self) -> BackupStatus:
        """Retorna informações sobre o sistema de backup"""
        backups = await self.list_backups()
        
        total_size = sum(backup.size_bytes for backup in backups)
        
        # Espaço disponível no disco
        disk_usage = shutil.disk_usage(self.backup_dir)
        available_space = disk_usage.free
        
        oldest_backup = min(backups, key=lambda x: x.created_at).created_at if backups else None
        newest_backup = max(backups, key=lambda x: x.created_at).created_at if backups else None
        
        return BackupStatus(
            backup_directory=str(self.backup_dir),
            total_backups=len(backups),
            total_size_bytes=total_size,
            total_size_human=self._format_size(total_size),
            oldest_backup=oldest_backup,
            newest_backup=newest_backup,
            available_space_bytes=available_space,
            available_space_human=self._format_size(available_space)
        )
