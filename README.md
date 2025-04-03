# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2c621e60-3d6c-41ae-a1f4-bd6467587ec7

## Entornos y Tablas de Supabase

Este proyecto utiliza dos entornos diferentes, cada uno con sus propias tablas en Supabase:

- **Desarrollo**: Utiliza tablas con prefijo `dev_` (ej: `dev_forms`, `dev_projects`)
- **Producción**: Utiliza tablas sin prefijo (ej: `forms`, `projects`)

Para compilar la aplicación para diferentes entornos, utiliza los siguientes comandos:

```bash
# Entorno de desarrollo
npm run build:dev

# Entorno de producción
npm run build:prod
```

La aplicación detectará automáticamente el entorno actual basándose en:
1. El valor de `window.ENV` establecido durante la compilación
2. La URL del sitio (localhost = desarrollo, otros = producción)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2c621e60-3d6c-41ae-a1f4-bd6467587ec7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2c621e60-3d6c-41ae-a1f4-bd6467587ec7) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
