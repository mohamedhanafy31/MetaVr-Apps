'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccessCodeGate, useAccessContext } from '../components/AccessCodeGate'
import { usePageTracking } from '../lib/page-tracking'
import { APP_KEY } from '../lib/access'
import { useAppLogger } from '../lib/logger'

interface Question {
  id: number
  question: string
  choices: string[]
  correctAnswer: string
  score: number
}

interface QuestionStatus {
  questionId: number
  answered: boolean
  isCorrect: boolean | null
}

function HomeContent() {
  const accessContext = useAccessContext()
  const activeAppId = accessContext.appId || APP_KEY
  const logger = useAppLogger('IQQuestionsApp')
  const [questions, setQuestions] = useState<Question[]>([])
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [questionsPerRound, setQuestionsPerRound] = useState<number>(20)
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string>('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [questionStatuses, setQuestionStatuses] = useState<Map<number, QuestionStatus>>(new Map())
  const [gameCompleted, setGameCompleted] = useState(false)

  usePageTracking({
    pageId: `iq-questions-${activeAppId}-play`,
    pageName: 'IQ Questions Assessment',
    pageType: 'app',
    appId: activeAppId,
    supervisorId: accessContext.supervisorId,
    userId: accessContext.userId,
    userEmail: accessContext.userEmail,
    userRole: accessContext.role ?? undefined,
    enabled: accessContext.role === 'user' && Boolean(accessContext.userId && accessContext.supervisorId),
    metadata: {
      source: 'iq-questions-app',
      appName: 'IQ Questions',
    },
  })

  // Fetch config from API
  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/iq-questions/api/config/')
      if (response.ok) {
        const config = await response.json()
        setQuestionsPerRound(config.questionsPerRound || 20)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  }, [])

  // Fetch questions from API
  const fetchQuestions = useCallback(async () => {
    logger.debug('fetch_questions_start')
    try {
      const response = await fetch('/iq-questions/api/questions/')
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
      }
      const data = await response.json()
      setAllQuestions(data)
      logger.info('questions_loaded', { data: { count: Array.isArray(data) ? data.length : 0 } })
    } catch (error) {
      logger.error('questions_fetch_failed', error, {
        data: { message: error instanceof Error ? error.message : String(error) },
      })
    } finally {
      setLoading(false)
    }
  }, [logger])

  // Update questions based on questionsPerRound config
  useEffect(() => {
    if (allQuestions.length > 0 && questionsPerRound > 0) {
      const limitedQuestions = allQuestions.slice(0, questionsPerRound)
      setQuestions(limitedQuestions)
    }
  }, [allQuestions, questionsPerRound])

  // Shuffle array function
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [])

  // Initialize question statuses when questions are loaded
  useEffect(() => {
    if (questions.length > 0) {
      const initialStatuses = new Map<number, QuestionStatus>()
      questions.forEach(q => {
        initialStatuses.set(q.id, {
          questionId: q.id,
          answered: false,
          isCorrect: null,
        })
      })
      setQuestionStatuses(initialStatuses)
    }
  }, [questions])

  // Load current question based on index
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const question = questions[currentQuestionIndex]
      setShuffledChoices(shuffleArray(question.choices))
      setSelectedAnswer(null)
      setShowFeedback(false)
      setFeedback('')
    } else if (questions.length > 0 && currentQuestionIndex >= questions.length) {
      // All questions completed
      setGameCompleted(true)
    }
  }, [questions, currentQuestionIndex, shuffleArray])

  // Fetch config and questions on mount
  useEffect(() => {
    fetchConfig()
    fetchQuestions()
  }, [fetchConfig, fetchQuestions])

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return // Prevent changing answer after submission

    setSelectedAnswer(answer)
    if (currentQuestion) {
      logger.debug('answer_selected', {
        data: { questionId: currentQuestion.id, answer },
      })
    }
  }

  // Handle answer submission
  const handleSubmit = () => {
    if (!selectedAnswer || questions.length === 0 || currentQuestionIndex >= questions.length) return

    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    setShowFeedback(true)

    const newScore = isCorrect ? score + currentQuestion.score : score

    if (isCorrect) {
      setScore(newScore)
      setFeedback(`Correct! You earned ${currentQuestion.score} points.`)
    } else {
      setFeedback(
        `Incorrect! The correct answer is "${currentQuestion.correctAnswer}".`
      )
    }

    // Update question status
    setQuestionStatuses(prev => {
      const updated = new Map(prev)
      updated.set(currentQuestion.id, {
        questionId: currentQuestion.id,
        answered: true,
        isCorrect,
      })
      return updated
    })

    logger.info('answer_submitted', {
      data: {
        questionId: currentQuestion.id,
        selectedAnswer,
        isCorrect,
        earned: isCorrect ? currentQuestion.score : 0,
        totalScore: newScore,
      },
    })
  }

  // Handle next question
  const handleNext = () => {
    logger.debug('next_question_requested', {
      data: {
        currentIndex: currentQuestionIndex,
        totalQuestions: questions.length,
      },
    })
    setIsTransitioning(true)
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      } else {
        // All questions completed
        setGameCompleted(true)
      }
      setIsTransitioning(false)
    }, 300)
  }

  // Reset game to start new round
  const handleReset = () => {
    setCurrentQuestionIndex(0)
    setScore(0)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setFeedback('')
    setGameCompleted(false)
    setIsTransitioning(false)
    
    // Reset question statuses
    const resetStatuses = new Map<number, QuestionStatus>()
    questions.forEach(q => {
      resetStatuses.set(q.id, {
        questionId: q.id,
        answered: false,
        isCorrect: null,
      })
    })
    setQuestionStatuses(resetStatuses)
    
    logger.info('game_reset', {
      data: { totalQuestions: questions.length, questionsPerRound },
    })
  }

  if (loading) {
    return <div className="container"><div className="loading">Loading</div></div>
  }

  if (questions.length === 0) {
    return (
      <div className="container">
        <h1>IQ Questions</h1>
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No questions available. Please add questions in the configuration page.</p>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const answeredCount = Array.from(questionStatuses.values()).filter(s => s.answered).length
  const totalQuestions = questions.length

  // Game completed screen
  if (gameCompleted) {
    const correctCount = Array.from(questionStatuses.values()).filter(s => s.isCorrect === true).length
    const maxScore = questions.reduce((sum, q) => sum + q.score, 0)
    
    return (
      <div className="container game-completed">
        <h1>🎉 Game Completed!</h1>
        <div className="score-container" style={{ marginTop: '30px' }}>
          <div className="score-label">Final Score</div>
          <div className="score">{score} <span style={{ fontSize: '1.2rem', color: '#a0aec0' }}>/ {maxScore} pts</span></div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '1.1rem', color: '#666' }}>
          <p>You answered <strong>{correctCount}</strong> out of <strong>{totalQuestions}</strong> questions correctly!</p>
          <p style={{ marginTop: '10px' }}>Accuracy: <strong>{Math.round((correctCount / totalQuestions) * 100)}%</strong></p>
        </div>
        <button className="next-button" onClick={handleReset} style={{ marginTop: '30px' }}>
          Start New Round
        </button>
      </div>
    )
  }

  return (
    <div className="game-layout">
      {/* Sidebar with question roadmap */}
      <div className="question-sidebar">
        <h3>Questions</h3>
        <div className="question-roadmap">
          {questions.map((q, index) => {
            const status = questionStatuses.get(q.id)
            const isCurrent = index === currentQuestionIndex
            const isAnswered = status?.answered || false
            const isCorrect = status?.isCorrect
            
            let statusClass = 'roadmap-item'
            if (isCurrent) statusClass += ' current'
            if (isAnswered && isCorrect) statusClass += ' correct'
            if (isAnswered && !isCorrect) statusClass += ' incorrect'
            if (isAnswered) statusClass += ' answered'
            
            return (
              <div key={q.id} className={statusClass}>
                <div className="roadmap-number">Q{index + 1}</div>
                <div className="roadmap-score">{q.score} pts</div>
                {isCurrent && <div className="roadmap-indicator">→</div>}
                {isAnswered && isCorrect && <div className="roadmap-check">✓</div>}
                {isAnswered && !isCorrect && <div className="roadmap-x">✗</div>}
              </div>
            )
          })}
        </div>
        <div className="roadmap-progress">
          <div className="progress-text">
            Progress: {answeredCount} / {totalQuestions}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
        <button className="reset-button" onClick={handleReset}>
          Reset Game
        </button>
      </div>

      {/* Main game area */}
      <div className="container game-main">
        <div className="game-header">
          <h1>IQ Questions</h1>
          <div className="score-container">
            <div className="score-label">Your Score</div>
            <div className="score">{score} <span style={{ fontSize: '1.2rem', color: '#a0aec0' }}>pts</span></div>
          </div>
        </div>

        <div className="question-container" style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          <div className="question-number">
            Question {currentQuestionIndex + 1} of {totalQuestions}
            <span className="question-score-badge">({currentQuestion.score} points)</span>
          </div>
          <div className="question">{currentQuestion.question}</div>
        </div>

        <div className="choices" style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.3s ease' }}>
          {shuffledChoices.map((choice, index) => {
            let buttonClass = 'choice-button'
            if (showFeedback) {
              if (choice === currentQuestion.correctAnswer) {
                buttonClass += ' correct'
              } else if (choice === selectedAnswer && choice !== currentQuestion.correctAnswer) {
                buttonClass += ' incorrect'
              }
            }

            const isSelected = selectedAnswer === choice && !showFeedback

            return (
              <button
                key={index}
                className={`${buttonClass} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(choice)}
                disabled={showFeedback}
              >
                {choice}
              </button>
            )
          })}
        </div>

        {showFeedback && (
          <div
            className={`feedback ${
              selectedAnswer === currentQuestion.correctAnswer ? 'correct' : 'incorrect'
            }`}
          >
            <span className="feedback-icon">
              {selectedAnswer === currentQuestion.correctAnswer ? '✓' : '✗'}
            </span>
            {feedback}
          </div>
        )}

        {!showFeedback ? (
          <button
            className="next-button"
            onClick={handleSubmit}
            disabled={!selectedAnswer}
          >
            Submit Answer
          </button>
        ) : (
          <button className="next-button" onClick={handleNext}>
            {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Game'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <AccessCodeGate requiredRole="user">
      <HomeContent />
    </AccessCodeGate>
  )
}

