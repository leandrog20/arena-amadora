# Admin Advance Player - Documentação

## 🎯 Objetivo

Permitir que administradores decidam **quem avança** no chaveamento (bracket) de um torneio, eliminando automaticamente o outro adversário.

## ✨ Características

- ✅ Apenas ADMIN e MODERATOR podem usar
- ✅ Elimina automaticamente o perdedor
- ✅ Avança o vencedor para próxima rodada
- ✅ Suporta SINGLE_ELIMINATION e DOUBLE_ELIMINATION
- ✅ Envia notificações para ambos jogadores
- ✅ Registra na metadata que foi decisão admin
- ✅ Emite WebSocket update em tempo real

## 📡 Endpoint

```http
POST /matches/:matchId/admin/advance
```

## 🔐 Autenticação

Requer token JWT com `userRole` = `ADMIN` ou `MODERATOR`

```
Authorization: Bearer <seu_jwt_token>
```

## 📝 Requisição

### Headers
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "Content-Type": "application/json"
}
```

### Body
```json
{
  "winnerId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Parâmetros:**
- `matchId` (URL): ID da partida (UUID)
- `winnerId` (JSON): ID do jogador que vai avançar (deve ser player1 ou player2)

## 📤 Resposta de Sucesso (200 OK)

```json
{
  "status": "success",
  "data": {
    "id": "match-uuid",
    "tournamentId": "tournament-uuid",
    "round": 2,
    "position": 1,
    "player1Id": "vencedor-uuid",
    "player2Id": "perdedor-uuid",
    "winnerId": "vencedor-uuid",
    "player1Score": null,
    "player2Score": null,
    "status": "COMPLETED",
    "completedAt": "2026-04-14T10:30:00Z",
    "metadata": {
      "advancedByAdmin": true,
      "adminAdvancedAt": "2026-04-14T10:30:00.000Z"
    },
    "tournament": {
      "id": "tournament-uuid",
      "title": "Torneio X",
      "game": "Street Fighter 6",
      "format": "SINGLE_ELIMINATION"
    },
    "player1": {
      "id": "vencedor-uuid",
      "username": "jogador1",
      "displayName": "Jogador 1",
      "avatarUrl": "...",
      "eloRating": 1200
    },
    "player2": {
      "id": "perdedor-uuid",
      "username": "jogador2",
      "displayName": "Jogador 2",
      "avatarUrl": "...",
      "eloRating": 1100
    },
    "winner": {
      "id": "vencedor-uuid",
      "username": "jogador1"
    }
  }
}
```

## ❌ Erros Possíveis

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Não autorizado"
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Apenas administradores podem avançar jogadores"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Partida não encontrada"
}
```

### 400 Bad Request
```json
{
  "status": "error",
  "message": "O jogador selecionado não participa desta partida"
}
```

## 🔄 O que Acontece Automaticamente

### Para o Vencedor:
1. ✅ Avança para a próxima rodada
2. ✅ Recebe notificação no app
3. ✅ Match fica COMPLETED
4. ✅ Metadata marca como "advancedByAdmin"

### Para o Perdedor:
1. ❌ É marcado como eliminado (isEliminated = true)
2. ⚠️ Recebe notificação de eliminação
3. ❌ Não recebe pontos ELO ou XP
4. ❌ Sai do torneio

### Para o Torneio:
1. 📊 Chaveamento avança automaticamente
2. 🔔 Próxima partida é preenchida com o vencedor
3. 💾 Cache é invalidado para atualizações em tempo real

## 💡 Exemplos de Uso

### Usando cURL

```bash
curl -X POST http://localhost:3000/matches/f47ac10b-58cc-4372/admin/advance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "winnerId": "player-uuid-here"
  }'
```

### Usando Postman

1. Method: **POST**
2. URL: `{{baseUrl}}/matches/{{matchId}}/admin/advance`
3. Headers: 
   - `Authorization: Bearer {{jwt_token}}`
   - `Content-Type: application/json`
4. Body (raw, JSON):
```json
{
  "winnerId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

### Usando JavaScript

```javascript
const response = await fetch(
  `/api/matches/${matchId}/admin/advance`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      winnerId: selectedPlayerId
    })
  }
);

const result = await response.json();
if (response.ok) {
  console.log('Jogador avançou!', result.data);
} else {
  console.error('Erro:', result.message);
}
```

## 🛡️ Casos de Uso

### 1️⃣ Jogador não apareceu
Admin identifica que um jogador não compareceu e avança o outro.

### 2️⃣ Problema técnico na partida
Se houve um problema técnico, o admin pode decidir quem avança.

### 3️⃣ Protesto resolvido
Após resolver um protesto/disputa, o admin marca manualmente quem avança.

### 4️⃣ Descuminhas do torneio
Admin pode corrigir manualmente erros no chaveamento.

## ⚠️ Validações

- Apenas ADMIN e MODERATOR podem usar
- O `winnerId` deve ser um dos dois jogadores (player1 ou player2)
- A partida não pode estar já finalizada
- O `matchId` deve ser UUID valido
- Requer token JWT válido

## 🔌 WebSocket Event

Após usar esse endpoint, será emitido um evento WebSocket:

```json
{
  "type": "MATCH_UPDATE",
  "data": {
    "matchId": "f47ac10b-58cc-4372",
    "winnerId": "vencedor-uuid",
    "status": "COMPLETED",
    "advancedByAdmin": true
  }
}
```

Listeners podem se registrar para atualizar UI em tempo real.

## 📚 Integração no Frontend

Você pode criar um botão no admin panel para fazer isso:

```typescript
async function advancePlayer(matchId: string, winnerId: string) {
  try {
    const response = await fetch(
      `/api/matches/${matchId}/admin/advance`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ winnerId })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const result = await response.json();
    showToast.success('Jogador avançou com sucesso!');
    // Atualizar bracket UI
    refreshMatchBracket();
  } catch (error) {
    showToast.error(`Erro: ${error.message}`);
  }
}
```

---

**Última atualização**: 14 de Abril de 2026  
**Versão**: 1.0.0
