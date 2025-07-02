#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc1MTA3ODQ2N30.CfyKq0iUvKOvH7KSj733b4S-P4QCpdl0SgGRHT0bT3s"
API="http://localhost:8000"

# 1. Obter IDs dos roteadores cadastrados
ROUTER_IDS=$(curl -s -X GET "$API/routers/" -H "Authorization: Bearer $TOKEN" | jq -r '.[].id')

for RID in $ROUTER_IDS; do
  echo "Populando Router ID: $RID"
  # 2. Criar 4 peerings IPv4 e 4 IPv6
  P4_IDS=()
  P6_IDS=()
  for j in {1..4}; do
    # IPv4
    PIDV4=$(curl -s -X POST "$API/peerings/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d "{\"name\":\"Peering IPv4 $j R$RID\",\"ip\":\"10.$RID.$j.1\",\"type\":\"IPv4\",\"remote_asn\":$((65000+RID)),\"remote_asn_name\":\"ASN IPv4 $j R$RID\",\"note\":\"Peering IPv4 $j do Router $RID\",\"router_id\":$RID}" | jq -r .id)
    P4_IDS+=($PIDV4)
    # IPv6
    PIDV6=$(curl -s -X POST "$API/peerings/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d "{\"name\":\"Peering IPv6 $j R$RID\",\"ip\":\"2001:db8:$RID:$j::1\",\"type\":\"IPv6\",\"remote_asn\":$((66000+RID)),\"remote_asn_name\":\"ASN IPv6 $j R$RID\",\"note\":\"Peering IPv6 $j do Router $RID\",\"router_id\":$RID}" | jq -r .id)
    P6_IDS+=($PIDV6)
  done

  # 3. Criar 2 grupos IPv4 (primeiros 2 e últimos 2 peerings IPv4)
  curl -s -X POST "$API/peering-groups/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Grupo IPv4 1 R$RID\",\"description\":\"Grupo IPv4 1 do Router $RID\",\"router_id\":$RID,\"peering_ids\":[${P4_IDS[0]},${P4_IDS[1]}]}"
  curl -s -X POST "$API/peering-groups/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Grupo IPv4 2 R$RID\",\"description\":\"Grupo IPv4 2 do Router $RID\",\"router_id\":$RID,\"peering_ids\":[${P4_IDS[2]},${P4_IDS[3]}]}"

  # 4. Criar 2 grupos IPv6 (primeiros 2 e últimos 2 peerings IPv6)
  curl -s -X POST "$API/peering-groups/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Grupo IPv6 1 R$RID\",\"description\":\"Grupo IPv6 1 do Router $RID\",\"router_id\":$RID,\"peering_ids\":[${P6_IDS[0]},${P6_IDS[1]}]}"
  curl -s -X POST "$API/peering-groups/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Grupo IPv6 2 R$RID\",\"description\":\"Grupo IPv6 2 do Router $RID\",\"router_id\":$RID,\"peering_ids\":[${P6_IDS[2]},${P6_IDS[3]}]}"
done

echo "População concluída!"
