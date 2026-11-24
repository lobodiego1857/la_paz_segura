# Prompt inicial para Codex o Claude Code

Lee primero `AGENTS.md`, `README.md`, `docs/REQUISITOS_Y_DECISIONES.md`, `docs/PLAN_DE_ENTREGA.md` y `docs/PRUEBAS_ACEPTACION.md`. El documento de propuesta aprobado tiene prioridad sobre cualquier suposición nueva.

Estamos en la fase 0 del desarrollo de La Paz Segura. La fecha de entrega es 10 de noviembre de 2026 y el presupuesto es cero. No afirmes que una conexión, despliegue o prueba ha funcionado hasta ejecutar la verificación correspondiente.

Objetivo inmediato:
1. Inspecciona la estructura y detecta errores de configuración o tipos.
2. Ejecuta `npm run check`.
3. Corrige únicamente los errores necesarios para tener una compilación reproducible.
4. No construyas módulos enteros ni generes datos falsos todavía.
5. Informa qué comandos ejecutaste, resultados reales, qué falta configurar en Supabase y el siguiente paso más pequeño.

Restricciones: mensajes en español; no añadas características fuera de alcance; no pongas `service_role` en frontend; los cambios de estado e historial deben permanecer atómicos; todas las reglas por rol deben validarse por RLS. No elimines migraciones existentes; crea migraciones nuevas si necesitas ajustar el esquema.
