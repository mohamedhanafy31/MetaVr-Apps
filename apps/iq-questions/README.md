# IQ Questions App

A simple Next.js application for IQ questions with random question selection and shuffled choices.

## Features

- Questions stored in local JSON file
- Random question selection
- Choices shuffled each time a question appears
- Score tracking based on question difficulty
- Simple and clean UI

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `questions.json` - Contains all questions with choices, correct answers, and scores
- `app/page.tsx` - Main page component with question logic
- `app/layout.tsx` - Root layout
- `app/globals.css` - Global styles

## Customization

Edit `questions.json` to add, remove, or modify questions. Each question should have:
- `id`: Unique identifier
- `question`: The question text
- `choices`: Array of answer choices
- `correctAnswer`: The correct answer (must match one of the choices)
- `score`: Points awarded for correct answer

