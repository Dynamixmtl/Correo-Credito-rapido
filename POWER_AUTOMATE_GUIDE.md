# Guide de configuration Power Automate

## Flux 1 – Réception du courriel et génération du lien (tenant admin@dynamixmtl.com)

### Déclencheur
- **Connecteur** : Office 365 Outlook
- **Action** : "When a new email arrives (V3)"
- **Paramètres** :
  - Dossier : `Inbox`
  - Filtre sujet : `CreditRapide`
  - *(Ne pas filtrer par expéditeur exact — accepter tout @csdm.qc.ca)*

> **Note :** Le connecteur Outlook ne supporte pas le filtre par domaine natif. Ajouter une condition après le déclencheur :
> - `triggerBody()?['from']` **contient** `@csdm.qc.ca`
> - Si la condition est **fausse** → terminer le flux (action "Terminate")

---

### Étape 1 – Parser le corps du courriel
- **Action** : "Compose" (ou "Initialize variable")
- Extraire les 3 valeurs du corps avec des expressions:

```
# Corps reçu (exemple): DOC-2024-001;50000;45000

nomDocument  = split(triggerBody()?['body'], ';')[0]
montant      = split(triggerBody()?['body'], ';')[1]
montantRetenu = split(triggerBody()?['body'], ';')[2]
```

Ou utiliser l'action **"Split text"** avec le séparateur `;`.

---

### Étape 2 – Appeler l'API pour créer la demande
- **Action** : HTTP
- **Méthode** : POST
- **URI** : `https://cr-dynamixmtl.azurewebsites.net/api/requests`
- **En-têtes** :
  ```
  Content-Type: application/json
  x-api-key: k4pSxJXAPcRrKqeZ8W7j9O0tfQaghHlvUoEDuBd6
  ```
- **Corps** :
  ```json
  {
    "nomDocument": "@{variables('nomDocument')}",
    "montant": "@{variables('montant')}",
    "montantRetenu": "@{variables('montantRetenu')}",
    "senderEmail": "@{triggerBody()?['from']}",
    "recipientEmail": "@{triggerBody()?['from']}"
  }
  ```
  > `senderEmail` = qui a envoyé le courriel (domaine @csdm.qc.ca)  
  > `recipientEmail` = à qui envoyer la notification de décision (même personne)

---

### Étape 3 – Extraire l'URL d'approbation de la réponse
- **Action** : "Parse JSON"
- **Contenu** : `Body` de l'étape HTTP précédente
- **Schéma** :
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "approvalUrl": { "type": "string" }
    }
  }
  ```

---

### Étape 4 – Envoyer le courriel avec le lien
- **Connecteur** : Office 365 Outlook
- **Action** : "Send an email (V2)"
- **Paramètres** :
  - De : `admin@dynamixmtl.com`
  - À : `acostasalcedo.d@csdm.qc.ca`
  - Objet : `CreditRapide – Lien d'approbation: @{variables('nomDocument')}`
  - Corps HTML :
    ```html
    <p>Veuillez transmettre ce lien d'approbation au fournisseur :</p>
    <p><a href="@{body('Parse_JSON')?['approvalUrl']}">
      Accéder au formulaire d'approbation
    </a></p>
    <p>Détails de la demande :<br>
    - Nom du document : @{variables('nomDocument')}<br>
    - Montant : @{variables('montant')}<br>
    - Montant retenu : @{variables('montantRetenu')}</p>
    ```

---

## Flux 2 – Transfert vers le fournisseur (tenant acostasalcedo.d@csdm.qc.ca)

Ce flux est à configurer de votre côté dans le tenant gouvernemental :

### Déclencheur
- **Connecteur** : Office 365 Outlook
- **Action** : "When a new email arrives"
- **Filtre sujet** : `CreditRapide – Lien d'approbation`
- **From** : `admin@dynamixmtl.com`

### Action
- Extraire le lien du corps du courriel
- Envoyer au fournisseur par courriel avec le lien et les détails

---

## Notes importantes

- L'endpoint `POST /api/requests` est protégé par une clé API dans le header `x-api-key`
- Chaque lien d'approbation est **unique et à usage unique** — une fois la décision prise, le lien affiche la décision finale
- Après approbation ou rejet, un courriel de notification est automatiquement envoyé à `acostasalcedo.d@csdm.qc.ca`
