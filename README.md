# Report System

A lightweight Flask application to create structured reports with topics, images, and PDF export.

## Features
- Multiple reports protected by 13-digit access keys.
- Topic CRUD with image uploads (file picker, drag-and-drop, paste).
- Per-report cover settings for PDF.
- Global configuration modal (gear icon) for:
  - System UI theme colors
  - PDF theme colors
  - App title/subtitle
  - PDF filename prefix
  - Logo visibility in UI

## Requirements
- Python 3.11+
- pip

## Quick Start
```bash
python -m venv .venv
# Windows
.venv\Scripts\Activate.ps1
# Linux/macOS
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
python server.py
```

Open: `http://localhost:5222`

## How to Use
1. Create a report and keep its generated access key.
2. Open the report with the key.
3. Add/edit topics and images.
4. Configure cover and theme (gear icon at top-right).
5. Export PDF.

## Run in Production (basic)
For simple deployment, run behind a reverse proxy (Nginx/Caddy) and process manager.

```bash
pip install waitress
python -m waitress --host 0.0.0.0 --port 5222 server:app
```

## Project Structure
- `server.py`: API and JSON persistence.
- `execution/pdf_generator.py`: PDF generation.
- `templates/index.html`: interface.
- `static/app.js`: frontend logic.
- `static/styles.css`: styles.

---

# Sistema de Relatorios

Aplicacao Flask para criar relatorios estruturados com topicos, imagens e exportacao em PDF.

## Funcionalidades
- Multiplos relatorios protegidos por chaves de acesso de 13 digitos.
- CRUD de topicos com upload de imagens (seletor, arrastar e soltar, colar).
- Configuracao de capa do PDF por relatorio.
- Modal global de configuracao (icone de engrenagem) para:
  - Cores do tema da interface
  - Cores do tema do PDF
  - Titulo/subtitulo da aplicacao
  - Prefixo do nome do arquivo PDF
  - Exibicao da logo na interface

## Requisitos
- Python 3.11+
- pip

## Inicio Rapido
```bash
python -m venv .venv
# Windows
.venv\Scripts\Activate.ps1
# Linux/macOS
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
python server.py
```

Acesse: `http://localhost:5222`

## Como Usar
1. Crie um relatorio e guarde a chave de acesso gerada.
2. Abra o relatorio com a chave.
3. Adicione/edite topicos e imagens.
4. Configure capa e tema (engrenagem no canto superior direito).
5. Exporte o PDF.

## Execucao em Producao (basico)
Para deploy simples, rode por tras de um proxy reverso (Nginx/Caddy) e um gerenciador de processo.

```bash
pip install waitress
python -m waitress --host 0.0.0.0 --port 5222 server:app
```

## Estrutura do Projeto
- `server.py`: API e persistencia em JSON.
- `execution/pdf_generator.py`: geracao de PDF.
- `templates/index.html`: interface.
- `static/app.js`: logica do frontend.
- `static/styles.css`: estilos.
