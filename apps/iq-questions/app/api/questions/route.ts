import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Find questions.json file - check multiple possible locations
function findQuestionsFile(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), 'questions.json'), // Production standalone
    path.join(process.cwd(), '..', 'questions.json'), // Production standalone (one level up)
    path.join(process.cwd(), '..', '..', 'questions.json'), // Production standalone (two levels up)
    path.join(process.cwd(), 'apps', 'iq-questions', 'questions.json'), // Development
  ]
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  
  return null
}

function getQuestions() {
  try {
    const questionsFilePath = findQuestionsFile()
    if (!questionsFilePath) {
      console.error('questions.json not found in any expected location')
      return []
    }
    const fileContents = fs.readFileSync(questionsFilePath, 'utf8')
    const parsed = JSON.parse(fileContents)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error reading questions file:', error)
    return []
  }
}

function saveQuestions(questions: any[]) {
  const questionsFilePath = findQuestionsFile()
  if (!questionsFilePath) {
    console.error('questions.json not found in any expected location')
    throw new Error('Cannot save questions: file not found')
  }
  fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2))
}

// GET /api/questions - Get all questions
export async function GET() {
  try {
    const questions = getQuestions()
    return NextResponse.json(questions, { status: 200 })
  } catch (error) {
    console.error('Error fetching questions:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch questions', 
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

// POST /api/questions - Create a new question
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, choices, correctAnswer, score } = body

    // Validation
    if (!question || !choices || !correctAnswer || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: question, choices, correctAnswer, score' },
        { status: 400 }
      )
    }

    if (!Array.isArray(choices) || choices.length === 0) {
      return NextResponse.json(
        { error: 'Choices must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!choices.includes(correctAnswer)) {
      return NextResponse.json(
        { error: 'correctAnswer must be one of the choices' },
        { status: 400 }
      )
    }

    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Score must be a positive number' },
        { status: 400 }
      )
    }

    const questions = getQuestions()
    
    // Generate new ID
    const newId = questions.length > 0 
      ? Math.max(...questions.map(q => q.id)) + 1 
      : 1

    const newQuestion = {
      id: newId,
      question,
      choices,
      correctAnswer,
      score,
    }

    questions.push(newQuestion)
    saveQuestions(questions)

    return NextResponse.json(newQuestion, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    )
  }
}

