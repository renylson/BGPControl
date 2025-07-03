#!/usr/bin/env python3
"""
Teste específico para o comando ping
"""
import time
import paramiko
import base64
import sys
import os

# Adicionar o diretório do projeto ao path
sys.path.insert(0, '/opt/bgpview/backend')

def test_ping_command():
    """Teste específico para comando ping"""
    
    # Configurações do roteador (usando valores de exemplo)
    router_config = {
        'ip': '45.168.154.12',  # IP do roteador PE-PTA-RT-BORDA-GRUPO
        'ssh_port': 22,
        'ssh_user': 'admin',  # usuário comum para equipamentos de rede
        'ssh_password': 'base64_encoded_password'  # senha codificada
    }
    
    source_ip = '187.16.212.173'  # IP de origem do exemplo
    target_ip = '8.8.8.8'  # Destino para teste
    
    print(f"🧪 Testando comando ping específico")
    print(f"📡 Roteador: {router_config['ip']}:{router_config['ssh_port']}")
    print(f"📤 Origem: {source_ip}")
    print(f"🎯 Destino: {target_ip}")
    print(f"💻 Comando: ping -c 3 -m 1 -a {source_ip} {target_ip}")
    print("-" * 60)
    
    try:
        start_time = time.time()
        
        # Decodificar senha (simular o processo real)
        # Em um teste real, você precisaria da senha correta codificada
        print("⚠️  NOTA: Este teste requer credenciais válidas do roteador")
        print("⚠️  Substituir pela senha correta codificada em base64")
        
        # Conectar via SSH
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print("🔗 Conectando via SSH...")
        client.connect(
            hostname=router_config['ip'],
            port=router_config['ssh_port'],
            username=router_config['ssh_user'],
            password='senha_aqui',  # Substituir pela senha real
            timeout=15
        )
        
        connect_time = time.time() - start_time
        print(f"✅ Conexão SSH estabelecida em {connect_time:.2f}s")
        
        # Comando ping específico com sintaxe correta
        command = f"ping -c 3 -m 1 -a {source_ip} {target_ip}"
        
        print(f"⚡ Executando: {command}")
        start_cmd = time.time()
        
        # Executar comando com timeout
        stdin, stdout, stderr = client.exec_command(command, timeout=30)
        
        # Ler resultado
        output = stdout.read().decode('utf-8', errors='ignore')
        error = stderr.read().decode('utf-8', errors='ignore')
        exit_status = stdout.channel.recv_exit_status()
        
        cmd_time = time.time() - start_cmd
        
        print(f"⏱️  Comando executado em {cmd_time:.2f}s")
        print(f"🔢 Exit status: {exit_status}")
        
        if output:
            print("📤 Saída:")
            print(output)
        
        if error:
            print("❌ Erros:")
            print(error)
        
        client.close()
        
        total_time = time.time() - start_time
        print(f"✅ Teste concluído em {total_time:.2f}s")
        
        if exit_status == 0:
            print("🎉 SUCESSO: Comando ping executado com sucesso!")
        else:
            print(f"⚠️  AVISO: Exit status {exit_status} indica possível problema")
            
    except paramiko.AuthenticationException as e:
        print(f"❌ ERRO de autenticação: {e}")
        print("💡 Verifique usuário e senha do roteador")
    except paramiko.SSHException as e:
        print(f"❌ ERRO SSH: {e}")
        print("💡 Verifique se o SSH está habilitado no roteador")
    except Exception as e:
        print(f"❌ ERRO: {e}")
        print("💡 Verifique conectividade de rede e configurações")

if __name__ == "__main__":
    test_ping_command()
