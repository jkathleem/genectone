# AGENTS.md

Regras para agentes de código neste projeto:

1. Sempre ler `/docs` antes de alterar regras de negócio.
2. `BUSINESS_RULES.md` e `DECISIONS.md` prevalecem sobre suposições.
3. Não inventar funcionalidades.
4. Não duplicar dados que possam ser derivados.
5. Não utilizar `Float` para valores monetários.
6. Não alterar migrations já aplicadas sem justificativa.
7. Implementar uma fase por vez.
8. Manter TypeScript strict.
9. Evitar uso indiscriminado de `any`.
10. Toda regra de negócio relevante deve possuir teste quando for implementada.
11. Não misturar DRE com Fluxo de Caixa.
12. Não assumir que OP cadastrada significa receita realizada.
13. Não assumir que quantidade retornada significa automaticamente quantidade paga.
14. Antes de criar nova entidade, verificar `DOMAIN_MODEL.md`.
15. Se uma decisão estiver marcada como pendente, não resolvê-la por conta própria.
