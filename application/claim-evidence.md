# Application claim evidence and review boundaries

This document supports candidate review before submitting the CV or email. Describing a project as personal work is different from claiming paid employment. No employment section was created because no employment history was supplied.

| Statement | Basis | Review boundary |
| --- | --- | --- |
| Eldar Smagulov; Astana, Kazakhstan; 1980sdm@gmail.com | Candidate-provided location and explicitly confirmed name/contact email | Telephone number is optional and omitted; no contact detail was inferred from a different Git identity. |
| First-year Cybersecurity student at Astana IT University; started in 2026 | Candidate-provided education | Degree is in progress; no graduation date, academic honors, or certificate is invented. |
| Python, JavaScript, HTML, CSS, C++; FastAPI; HTTP/JSON/REST; SQL/PostgreSQL fundamentals; Git/Docker/VS Code/OpenAPI | Candidate-provided background | No proficiency scale or years of experience is inferred. Be ready to demonstrate these skills in an interview. |
| AqZhol / SafeRoute work with FastAPI, mapping integrations, backend endpoints, route calculations | Candidate-provided personal-project description | Exact repository was inaccessible under the guessed names. No executed tests, safety guarantees, production users, or deployment claims are added. |
| CyberLearn API endpoints and request models | Read-only current source review recorded in `docs/portfolio-review.md` | Code was inspected, not executed. No automated test or deployment outcome is asserted. |
| SearchScope implementation | Actual local Rails/Mongoid/MongoDB backend and React/TypeScript frontend | Implemented authentication, per-user persisted history with pagination/detail/deletion, stored-result URL/domain/rank comparison, and analytics from owned records. Demo searches are explicitly synthetic. Public publication is authorized to https://github.com/rokerblym/searchscope; verify the completed push before describing its source as published. |
| SearchScope provider handling | Server-side SerpApi HTTPS adapter and mocked tests | Verified HTTPS configuration, timeouts, bounded pre-connection retries, and sanitized errors are implemented. No paid live-provider call was performed; mocked success does not establish live provider access. |
| SearchScope local automated validation | Engineering lead's executed check evidence: 79 RSpec examples with zero failures and 47 Vitest tests passing | Frontend lint/format/type/build checks also passed locally. See `docs/validation-report.md` for the final executed commands and report. GitHub Actions is configured but no remote successful run is claimed. |
| SearchScope containerization | Docker development/production configuration and local image work | Container build evidence belongs to the engineering validation report. No external deployment, production monitoring, AWS deployment, uptime, or user metrics are claimed. |
| Ruby/Rails/MongoDB/React/TypeScript learning | SearchScope study and implementation context | Project use alone does not establish independent candidate proficiency. Explain and change the implementation before adding these as mastered skills. |

SearchScope was developed with Codex assistance during this session. Review its code, understand its important boundaries, and represent your own contribution and understanding accurately. Automated test results describe the checked software; they do not certify the candidate's knowledge.

Candidate name and application email are confirmed as Eldar Smagulov and 1980sdm@gmail.com. Future SearchScope attribution can use that confirmed identity; no older attribution is rewritten. An unavailable telephone number and graduation date remain omitted. See `contact-needed.md`. The profile links and confirmed email are intentional application contact information; API keys, login cookies, passwords, and unrelated users' details must never be added to these materials.

## Document-generation verification

The document generator ran successfully using Python, ReportLab 4.4.9, and python-docx 1.2.0 in this environment. A local pypdf check confirmed one PDF page, extractable text, the confirmed name/email, the prepared SearchScope URL, and the required project/education fields. python-docx reopened the DOCX successfully and found those same fields. PDF author and DOCX author/last-modifier metadata use Eldar Smagulov. The PDF was rasterized with `pdftoppm` and visually inspected for clipping and readable layout. These checks validate the generated draft files, not a submitted application or a particular ATS vendor.

LibreOffice was unavailable, so DOCX page count was not confirmed in a word processor. The DOCX uses A4 dimensions, simple paragraphs, conventional typography, and no tables or text boxes; review its pagination in **Microsoft Word** or **LibreOffice** before sending it.
