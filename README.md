# Gruvbox Music Player

Um player de música moderno com tema Gruvbox que lê arquivos de música em tempo real do seu dispositivo local.

## ✅ Atualizações Recentes

### 🔧 **Correções de Layout (v1.1)**
- **Problema Resolvido**: Conteúdo aparecendo abaixo da sidebar em vez de ao lado
- **Navegação Corrigida**: Transições suaves entre Biblioteca, Playlists, Favoritas e Configurações
- **Layout Responsivo**: Melhor experiência em dispositivos móveis
- **Flexbox Otimizado**: Layout mais robusto e estável
- **Botão Voltar**: Navegação aprimorada na página de configurações

## Funcionalidades

### 🎵 **Player de Música**
- Reprodução de arquivos MP3, WAV, OGG, M4A e FLAC
- Leitura em tempo real de pastas (sem cache no browser)
- Extração automática de metadados (título, artista, álbum, capa)
- Interface moderna com tema Gruvbox

### 🎛️ **Controles de Reprodução**
- Play/Pause
- Próxima/Anterior
- Shuffle (reprodução aleatória)
- Repeat (repetir música atual)
- Controle de volume
- Barra de progresso interativa

### ❤️ **Gerenciamento de Músicas**
- Sistema de favoritos (like/unlike)
- Busca por título, artista ou álbum
- Visualização de capas de álbum
- Organização por biblioteca

### 📝 **Playlists**
- Criação de playlists personalizadas
- Adição/remoção de músicas
- Reprodução de playlists completas
- Persistência local (localStorage)

### 🎨 **Interface**
- Tema Gruvbox (cores quentes e aconchegantes)
- Design responsivo
- Ícones Font Awesome
- Animações suaves

## Como Usar

1. **Abra o arquivo `index.html` no seu navegador**
2. **Clique em "Carregar Pasta"** para selecionar uma pasta com suas músicas
3. **Navegue pela biblioteca** usando a sidebar
4. **Clique em uma música** para reproduzir
5. **Use os controles** na parte inferior para gerenciar a reprodução

## Estrutura do Projeto

```
musicplayer/
├── index.html          # Estrutura HTML principal
├── styles.css          # Estilos CSS com tema Gruvbox
├── script.js           # Lógica JavaScript do player
└── README.md           # Este arquivo
```

## Tecnologias Utilizadas

- **HTML5** - Estrutura e elemento `<audio>`
- **CSS3** - Estilização com tema Gruvbox e responsividade
- **JavaScript ES6+** - Lógica do player e manipulação de arquivos
- **Font Awesome** - Ícones da interface
- **jsmediatags** - Extração de metadados de arquivos MP3

## Características Técnicas

### Leitura de Metadados
- Utiliza a biblioteca `jsmediatags` para extrair informações dos arquivos
- Suporte a capas de álbum embutidas
- Fallback para nomes de arquivo quando metadados não estão disponíveis

### Armazenamento Local
- Playlists salvas no `localStorage`
- Lista de favoritos persistente
- Configurações do player mantidas entre sessões

### Responsividade
- Design adaptável para desktop e mobile
- Layout otimizado para diferentes tamanhos de tela
- Controles touch-friendly

## Paleta de Cores (Gruvbox)

- **Background**: `#282828` (escuro)
- **Foreground**: `#fbf1c7` (claro)
- **Accent Green**: `#b8bb26` (verde principal)
- **Accent Red**: `#fb4934` (vermelho para favoritos)
- **Accent Yellow**: `#fabd2f` (amarelo para destaques)

## Navegadores Suportados

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

> **Nota**: Requer suporte para `webkitdirectory` para seleção de pastas.

## Privacidade

- Todas as músicas são processadas localmente
- Nenhum dado é enviado para servidores externos
- As músicas não são armazenadas em cache pelo navegador
- Playlists e favoritos ficam apenas no seu dispositivo

## Limitações

- Requer permissão do usuário para acessar arquivos locais
- Funciona apenas com arquivos no dispositivo local
- Não suporta streaming de URLs externas
- Dependente das capacidades de codecs do navegador

---

**Desenvolvido com ❤️ e tema Gruvbox**
