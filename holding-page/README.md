# Holding Page

This project contains the source code for the holding page of our application. The holding page is a simple static site built with modern web technologies.

## Project Structure

- `index.html`: The main HTML file for the holding page.
- `src/`: Contains the source code for the holding page.
- `public/`: Contains public assets such as images and fonts.
- `package.json`: Contains the project dependencies and scripts.
- `yarn.lock`: Contains the exact versions of the project dependencies.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed [Node.js](https://nodejs.org/) (version 20 or higher).
- You have installed [Yarn](https://yarnpkg.com/) package manager.

## Installation

To install the project dependencies, run the following command in the `holding-page` directory:

```sh
yarn install
```

## Building the Project

To build the project, run the following command in the holding-page directory:

```sh
yarn build
```

This will generate the static files in the `dist` directory.

## Running the Project Locally

To run the project locally for development, run the following command in the `holding-page` directory:

```sh
yarn start
```

## Deployment

The holding page is automatically deployed to GitHub Pages using a GitHub Actions workflow. The deployment is triggered on every push to the `main` branch.
