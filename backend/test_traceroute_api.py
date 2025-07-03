#!/usr/bin/env python3
"""
Script para testar a API de traceroute atualizada
"""

import requests
import time
import json

BASE_URL = "http://127.0.0.1:8000"

def test_traceroute_api():
    """Testa a API de traceroute"""
    print("🧪 Testando API de traceroute com comandos atualizados")
    print("=" * 60)
    
    # 1. Buscar roteadores disponíveis
    print("📡 Buscando roteadores disponíveis...")
    try:
        response = requests.get(f"{BASE_URL}/looking-glass/routers")
        if response.status_code == 200:
            routers = response.json()
            print(f"✅ Encontrados {len(routers)} roteadores")
            
            if not routers:
                print("❌ Nenhum roteador disponível")
                return False
            
            # Usar o primeiro roteador
            router = routers[0]
            router_id = router["id"]
            print(f"🎯 Usando roteador: {router['name']} (ID: {router_id})")
            
            # Verificar se há IPs de origem
            if not router.get("ip_origens"):
                print("⚠️  Roteador não possui IPs de origem configurados")
                return False
            
            source_ip_id = router["ip_origens"][0]["id"]
            source_ip = router["ip_origens"][0]["ip"]
            print(f"🔗 Usando IP de origem: {source_ip} (ID: {source_ip_id})")
            
        else:
            print(f"❌ Erro ao buscar roteadores: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False
    
    # 2. Testar traceroute IPv4
    print(f"\n📍 Testando traceroute IPv4 para 8.8.8.8")
    
    payload = {
        "routerId": router_id,
        "type": "traceroute",
        "target": "8.8.8.8",
        "options": {
            "sourceIp": source_ip_id,
            "maxHops": 10
        }
    }
    
    try:
        response = requests.post(f"{BASE_URL}/looking-glass/query", json=payload)
        if response.status_code == 200:
            result = response.json()
            query_id = result["id"]
            print(f"✅ Query iniciada com ID: {query_id}")
            
            # Aguardar resultado
            print("⏳ Aguardando resultado...")
            for i in range(30):  # Máximo 30 segundos
                time.sleep(1)
                
                status_response = requests.get(f"{BASE_URL}/looking-glass/query/{query_id}")
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    
                    if status_data["status"] == "completed":
                        print("✅ Traceroute concluído!")
                        output = status_data.get("output", "")
                        if output:
                            print("📋 Output (primeiras 300 caracteres):")
                            print("-" * 50)
                            print(output[:300] + "..." if len(output) > 300 else output)
                            print("-" * 50)
                        return True
                    elif status_data["status"] == "error":
                        print(f"❌ Erro na execução: {status_data.get('error', 'Erro desconhecido')}")
                        return False
                    else:
                        print(f"⏳ Status: {status_data['status']}")
                
            print("⏰ Timeout aguardando resultado")
            return False
            
        else:
            print(f"❌ Erro ao iniciar traceroute: {response.status_code}")
            print(response.text)
            return False
            
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return False

if __name__ == "__main__":
    success = test_traceroute_api()
    
    if success:
        print("\n🎉 Teste de traceroute via API concluído com sucesso!")
        print("✅ Comando tracert com nova sintaxe funcionando corretamente")
    else:
        print("\n💥 Teste falhou")
    
    print("=" * 60)
