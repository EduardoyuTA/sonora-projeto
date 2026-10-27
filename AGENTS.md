# Repository Guidelines

## Estrutura do projeto e organização dos módulos

O código fica em `src/`. Componentes React estão em `src/components/`, integrações e regras de persistência/conversão em `src/services/`, tipos em `src/types/` e utilitários em `src/utils/`. Estilos globais ficam em `src/index.css`; estilos da aplicação, em `src/App.css`. Arquivos servidos sem transformação, como ícones, imagens e o vídeo de demonstração, pertencem a `public/`. Configurações de Vite e TypeScript ficam na raiz.

## Comandos de desenvolvimento, build e verificação

- `npm install`: instala as dependências registradas em `package-lock.json`.
- `npm run dev`: inicia o servidor Vite com recarregamento automático.
- `npm run build`: executa a verificação TypeScript e gera a versão de produção em `dist/`.
- `npm run lint`: verifica `src/` com Oxlint e as regras de React/TypeScript.
- `npm run preview`: serve localmente o build de produção para validação final.

Antes de abrir um pull request, execute pelo menos `npm run lint` e `npm run build`.

## Estilo de código e convenções de nomes

Use TypeScript estrito, componentes funcionais e imports ES modules. Siga o estilo existente: indentação de dois espaços, aspas simples e ausência de ponto e vírgula. Nomeie componentes e tipos em `PascalCase` (`WaveformPlayer`), funções e variáveis em `camelCase` (`loadSettings`) e arquivos de componentes em `PascalCase.tsx`. Mantenha serviços focados em uma responsabilidade e prefira tipos compartilhados em `src/types/sonora.ts`. O Oxlint é a referência para lint; não ignore alertas sem justificativa.

## Diretrizes de testes

O projeto ainda não possui framework ou arquivos de teste. Ao alterar conversão de áudio, armazenamento ou fluxos de interface, valide manualmente upload, demonstração, cancelamento, download, histórico e temas no `npm run dev`. Se uma suíte for adicionada, prefira Vitest com React Testing Library e arquivos `*.test.ts` ou `*.test.tsx` próximos ao módulo testado. Cubra regressões e casos de erro, não apenas o caminho principal.

## Commits e pull requests

Este diretório não inclui histórico Git; portanto, não foi possível inferir uma convenção existente. Use mensagens no imperativo e, preferencialmente, Conventional Commits, como `feat: adicionar corte de áudio` ou `fix: liberar URL temporária`. Pull requests devem explicar objetivo e impacto, indicar validações executadas, vincular issues e incluir capturas ou vídeo para mudanças visuais. Mantenha cada PR pequeno e sem refatorações não relacionadas.

## Segurança e configuração

Não versione arquivos gerados, mídia temporária, segredos ou credenciais. Preserve o processamento local no navegador e revise cuidadosamente qualquer mudança que envie arquivos do usuário a serviços externos.
