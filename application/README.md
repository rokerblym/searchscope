# SerpApi application materials

These materials are intended for candidate review. They use the confirmed name Eldar Smagulov and email 1980sdm@gmail.com, distinguish personal projects from employment, and omit an unavailable telephone number and graduation date. The implemented SearchScope source is published at https://github.com/rokerblym/searchscope, with public access verified. Remote CI evidence is recorded in `claim-evidence.md` and `docs/publication-report.md`. No application email has been sent, and no deployment is claimed.

- `cv-content.md`: the CV source, used to generate both formats.
- `Eldar_Smagulov_SerpApi_Junior_Fullstack_CV.pdf`: one-page PDF for review.
- `Eldar_Smagulov_SerpApi_Junior_Fullstack_CV.docx`: editable Word version.
- `cover-email.md`: recipient, requested subject, and concise email draft.
- `interview-preparation.md`: explanations and practical exercises, not a claim of candidate proficiency.
- `github-profile-README.md`: separate proposed GitHub profile content.
- `contact-needed.md`: confirmed contact details and remaining optional review items.
- `claim-evidence.md`: evidence boundaries and document verification.

## Regenerate the CV

Run from the repository in **macOS Terminal** or the cloud terminal:

```sh
python3 -m venv /tmp/searchscope-cv-venv
/tmp/searchscope-cv-venv/bin/pip install -r application/requirements.txt
/tmp/searchscope-cv-venv/bin/python application/generate_cv.py
```

The generator uses ReportLab and python-docx, makes no network calls, and writes only the two CV files in `application/`. It uses DejaVu Sans when the corresponding installed font files are available; otherwise PDF output uses Helvetica. PDF metadata does not contain an invented email or employer.

The original source review for older repositories is in `docs/portfolio-review.md`. Test claims for SearchScope must follow actual executed checks recorded by the engineering validation report. Generated code or interview notes do not establish that the candidate understands a technology; practice, explain decisions, and resolve exercises before adding proficiency claims.

## Review checklist

1. In **VS Code**, review `cv-content.md`, confirm the supplied email is correct, and ensure each project statement reflects your own work.
2. In **macOS Terminal**, regenerate the PDF and DOCX after factual edits.
3. In **Browser**, check the vacancy and public access to project links. Inspect the PDF at normal zoom and confirm it is one page.
4. In **GitHub**, review the published SearchScope source and its validation documentation. Its public repository URL is included in the CV and email; check any later workflow outcome before making a remote CI claim.
5. In your email application, attach the final CV and send only after explicit approval. This repository does not automate sending.
