import paramiko
import base64
from app.models.router import Router

def run_ssh_command(router: Router, command: str) -> str:
    # Decodificar senha
    try:
        password = base64.b64decode(router.ssh_password.encode()).decode()
    except:
        # Se falhar na decodificação, usar a senha como está (caso não esteja codificada)
        password = router.ssh_password
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=router.ip,
        port=router.ssh_port,
        username=router.ssh_user,
        password=password,
        look_for_keys=False,
        allow_agent=False
    )
    stdin, stdout, stderr = ssh.exec_command(command)
    output = stdout.read().decode()
    ssh.close()
    return output
