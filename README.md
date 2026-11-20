# Controle mensal

Aplicação Next.js para registrar receitas e despesas. O núcleo financeiro e a persistência são independentes da interface, para que o armazenamento local possa ser substituído por uma API.

## Estrutura

- `src/types`: contratos do domínio, categorias e resultados explícitos de operação.
- `src/utils/validarRegistro.ts`: validação e normalização central de todas as entradas, inclusive dados carregados.
- `src/domain/resumoFinanceiro.ts`: cálculo mensal de receitas, despesas, saldo e despesas por categoria.
- `src/repositories`: contratos assíncronos e adaptadores LocalStorage para registros, categorias e metas.
- `src/context/Context.tsx`: coordena operações; persiste antes de publicar mudanças e serializa gravações concorrentes.

Categorias são entidades próprias (`id`, nome e tipo), persistidas separadamente. Lançamentos referenciam `categoriaId`; os IDs mantêm as referências estáveis quando o nome muda. A exclusão é bloqueada enquanto houver lançamentos associados e cada tipo sempre mantém ao menos uma categoria.

Metas de economia são definidas por competência mensal (`YYYY-MM`) e persistidas separadamente. Um valor zero remove a meta daquele mês. O painel compara a meta com o saldo mensal calculado a partir dos lançamentos.

## Dados e migração local

Os registros incluem tipo, ID da categoria, descrição, valor e data civil (`YYYY-MM-DD`). Valores aceitam no máximo duas casas decimais. Totais são calculados em centavos.

Os repositórios gravam em `controle-financeiro.registros`, `controle-financeiro.categorias` e `controle-financeiro.metas`. Na primeira leitura, importa a chave antiga `registros`, acrescentando uma categoria padrão e a data do dia da migração aos registros que ainda não tinham esses campos. A chave antiga é preservada. Categorias do formato anterior viram IDs estáveis compatíveis com os lançamentos migrados. JSON corrompido, registros inválidos, IDs duplicados ou versões desconhecidas interrompem a leitura sem substituir os dados existentes.

## Limites de segurança

LocalStorage é armazenamento local de conveniência, não uma fronteira de segurança: quem controla o navegador ou o perfil do sistema pode ler, alterar ou apagar esses dados. Sem login, pessoas que compartilham o mesmo perfil do navegador também compartilham registros e categorias; perfis de navegador diferentes mantêm armazenamentos separados. A validação do cliente previne dados inconsistentes acidentais, mas não autentica usuários nem protege contra adulteração deliberada. Não armazenar segredos ou credenciais nesse repositório.

Para sincronização futura, as implementações remotas devem cumprir `RegistroRepository` e `CategoriaRepository`, repetir as validações no servidor e derivar a identidade do usuário da sessão autenticada. Registros e categorias precisam ser vinculados ao usuário no banco, com regras de acesso que impeçam leitura ou alteração cruzada. Backups e migrações pertencem à camada remota; chaves administrativas nunca devem ir para o cliente.

## Executar localmente

```bash
npm install
npm run dev
```

A aplicação será servida em `http://localhost:3000`.
