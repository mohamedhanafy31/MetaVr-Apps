import fs from 'fs'
import path from 'path'

export interface Question {
  id: number
  question: string
  choices: string[]
  correctAnswer: string
  score: number
}

const questionsFilePath = path.join(process.cwd(), 'questions.json')

export function getQuestions(): Question[] {
  try {
    // Check if file exists
    if (!fs.existsSync(questionsFilePath)) {
      console.error(`Questions file not found at: ${questionsFilePath}`)
      console.error(`Current working directory: ${process.cwd()}`)
      return []
    }
    const fileContents = fs.readFileSync(questionsFilePath, 'utf8')
    const parsed = JSON.parse(fileContents)
    if (!Array.isArray(parsed)) {
      console.error('Questions file does not contain an array')
      return []
    }
    return parsed
  } catch (error) {
    console.error('Error reading questions file:', error)
    console.error(`File path: ${questionsFilePath}`)
    console.error(`Current working directory: ${process.cwd()}`)
    return []
  }
}

export function saveQuestions(questions: Question[]): void {
  fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2))
}

