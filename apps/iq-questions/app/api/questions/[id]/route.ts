import { NextRequest, NextResponse } from 'next/server'
import { getQuestions, saveQuestions, Question } from '@/lib/questions'

// GET /api/questions/[id] - Get a single question by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid question ID' },
        { status: 400 }
      )
    }

    const questions = getQuestions()
    const question = questions.find(q => q.id === id)

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(question, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    )
  }
}

// PUT /api/questions/[id] - Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid question ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { question, choices, correctAnswer, score } = body

    const questions = getQuestions()
    const questionIndex = questions.findIndex(q => q.id === id)

    if (questionIndex === -1) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Validation
    if (choices && (!Array.isArray(choices) || choices.length === 0)) {
      return NextResponse.json(
        { error: 'Choices must be a non-empty array' },
        { status: 400 }
      )
    }

    const updatedChoices = choices || questions[questionIndex].choices
    const updatedCorrectAnswer = correctAnswer || questions[questionIndex].correctAnswer

    if (updatedChoices && !updatedChoices.includes(updatedCorrectAnswer)) {
      return NextResponse.json(
        { error: 'correctAnswer must be one of the choices' },
        { status: 400 }
      )
    }

    if (score !== undefined && (typeof score !== 'number' || score < 0)) {
      return NextResponse.json(
        { error: 'Score must be a positive number' },
        { status: 400 }
      )
    }

    // Update question
    const updatedQuestion: Question = {
      id,
      question: question !== undefined ? question : questions[questionIndex].question,
      choices: updatedChoices,
      correctAnswer: updatedCorrectAnswer,
      score: score !== undefined ? score : questions[questionIndex].score,
    }

    questions[questionIndex] = updatedQuestion
    saveQuestions(questions)

    return NextResponse.json(updatedQuestion, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    )
  }
}

// DELETE /api/questions/[id] - Delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid question ID' },
        { status: 400 }
      )
    }

    const questions = getQuestions()
    const questionIndex = questions.findIndex(q => q.id === id)

    if (questionIndex === -1) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    const deletedQuestion = questions[questionIndex]
    questions.splice(questionIndex, 1)
    saveQuestions(questions)

    return NextResponse.json(
      { message: 'Question deleted successfully', question: deletedQuestion },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    )
  }
}

