# 🌍 Geosense

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![GSAP](https://img.shields.io/badge/gsap-88CE02?style=for-the-badge&logo=greensock&logoColor=white) ![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white) ![Google Chrome](https://img.shields.io/badge/Google%20Chrome-4285F4?style=for-the-badge&logo=GoogleChrome&logoColor=white)

Este projeto implementa uma aplicação web leve e focada no cliente, que exibe condições climáticas atuais por cidade e manchetes de notícias selecionadas, utilizando uma abordagem serverless com Netlify Functions.

### 🛠️ Funcionalidades Principais

- **Clima por Cidade**: Obtém condições climáticas atuais via OpenWeather, com unidades métricas e strings localizadas.
- **Manchetes Principais**: Recupera e filtra notícias do NewsAPI, com limpeza de conteúdo e verificações de segurança.
- **Rápido e Simples**: Frontend estático (`index.html` + assets) sem necessidade de build.
- **Backend Serverless**: Funções Netlify para clima e notícias.
- **Interface Responsiva**: Estilos básicos e interações JavaScript, com ganchos opcionais para animações via GSAP.
- **Atalho de Teclado para Notícias**: Pressione `Ctrl + →` para carregar notícias novas e não vistas. Use `Ctrl + ←` para animar na direção oposta.

### 🧰 Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript
- GSAP (para animações)
- Jest (para testes)
- Netlify Functions

### 🔩 Estrutura do Projeto

- `index.html`: Estrutura principal e interface do usuário.
- `public/assets/js/main.js`: Lógica do cliente (requisições, renderização, vinculação de eventos, ganchos de animação).
- `public/assets/css/`: Arquivos de estilos.
- `public/assets/img/`: Imagens.
- `netlify/functions/weather.js`: Manipulador para a rota `/.netlify/functions/weather`.
- `netlify/functions/news.js`: Manipulador para a rota `/.netlify/functions/news`.

### 🌐 Endpoints da API

A aplicação frontend consome as seguintes rotas estáveis (Netlify Functions):

- `GET /.netlify/functions/weather?city=<CityName>`
  - Parâmetro: `city` (padrão: `Oakland`)
  - Resposta: Payload bruto do OpenWeather

- `GET /.netlify/functions/news?exclude=["Title1","Title2",...]`
  - Parâmetro: `exclude` (opcional): Array codificado em JSON com títulos de artigos a excluir (insensível a maiúsculas/minúsculas)
  - Resposta: `{ articles: Array<NewsArticle> }` (filtrado e limpo)

**Nota**: Para desenvolvimento local, um servidor Express (`index.js`) oferece rotas proxy equivalentes em `/api/weather` e `/api/news`.

### 📝 Notas de Implementação

- **`netlify/functions/weather.js`**
  - Lê o parâmetro `city` da query string; padrão é `Oakland`.
  - Chama a API OpenWeather com `units=metric` e `lang=pt_br`.
  - Timeout de 10 segundos e respostas de erro estruturadas.

- **`netlify/functions/news.js`**
  - Solicita manchetes principais (EUA) com `pageSize=30` e timeout de 10 segundos.
  - Normaliza campos e remove marcadores `[...]` no final do `content`.
  - Filtra itens com texto relevante e exclui títulos listados em `exclude` (insensível a maiúsculas/minúsculas).

- **`public/assets/js/main.js`**
  - Utiliza `fetch('/.netlify/functions/weather')` e `fetch('/.netlify/functions/news')`.
  - Implementa atalhos `Ctrl + Seta` para carregar notícias novas, mantendo um cache de títulos vistos em `localStorage` e enviando como `exclude` em novas requisições.
  - Fornece funções `escapeHtml` e `escapeAttr` para renderização segura e ganchos para `window.GeoAnimations?.animateInitial()` e `animateNewsItems()`.

### 🤔 Como Executar o Projeto Localmente

- Clone o repositório com `git clone` ou baixe o arquivo `.zip`.
- Configure as variáveis de ambiente para as chaves de API do OpenWeather e NewsAPI.
- Instale as dependências com `npm install`.
- Execute o servidor local com `npm start` (para o Express) ou implante no Netlify para usar Functions.
- Acesse a aplicação no navegador em `http://localhost:8888` (ou a URL fornecida pelo Netlify).

### © 2025 Geosense
