# Balo English Medium School website

This repository is the public website for **Balo English Medium School**, a community school and NGO in Salkia, Howrah (West Bengal). The school offers free English-medium education to children in neighbourhoods such as Babudanga and Pilkhana.

The site is meant for families, volunteers, donors, and well-wishers: it tells the school’s story, shows life on campus, and makes it easy to get in touch.

## What you can do here

- Learn about the school, leadership, staff, and volunteers
- Browse academics, facilities, extracurriculars, rules, and the calendar
- See photos, events, and a virtual tour
- Read about the **BALO Welfare Society**
- Send an enquiry (admissions, volunteering, donations, general questions)
- Chat with **BALO AI**, an on-site assistant trained on school information
- Staff can sign in to an admin area to manage notices, knowledge, and AI settings

Pages are available in English, Hindi, and Bengali.

## Tech

- [TanStack Start](https://tanstack.com/start) (React, file-based routing)
- Vite, Tailwind CSS, Framer Motion
- Supabase for data and auth
- BALO AI chat (server routes + knowledge base)

Routes live in `src/routes/`. See `src/routes/README.md` for routing conventions.

## Local development

```bash
npm install
npm run dev
```

`npm run dev` prints a **Network** URL (for example `http://192.168.1.12:5173`). Open that on a phone or another laptop on the same Wi‑Fi. The site on `http://localhost:5173` only works on this computer.

**BALO AI needs this Vite/Node process.** It is not a static page: the browser posts to `/api/chat`, and the server talks to Gemini with keys from `.env`. If you only run `vite preview`, host the `dist` folder, or open the site without those keys, the pages load but chat will fail.

You will need Supabase environment variables for enquiry, admin, and AI features (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and the matching server-side keys: `BALO_ASSISTANT_API_KEY`, `GEMINI_API_KEY`). Ask a maintainer for a local `.env` rather than committing secrets.

```bash
npm run build    # production build (Node server for AWS)
npm start        # run the production server (after build)
npm run preview  # preview the build
npm run lint
```

To host on **AWS Lightsail** (BALO AI + admin login included), follow **[LIGHTSAIL.md](./LIGHTSAIL.md)** — written for a first-time deploy.

This project is also connected to [Lovable](https://lovable.dev). Keep the default branch in a working state; avoid rewriting published git history.

## Credits

The site was built by Rehan Jamil, Shahil Sharma, and Shibran Khatoon. See `/developers` on the live site.
