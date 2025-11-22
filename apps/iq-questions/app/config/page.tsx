'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AccessCodeGate } from '../../components/AccessCodeGate'
import { usePageTracking } from '../../lib/page-tracking'
import { APP_KEY } from '../../lib/access'

interface Question {
  id: number
  question: string
  choices: string[]
  correctAnswer: string
  score: number
}

interface GameConfig {
  questionsPerRound: number
}

function ConfigPageContent() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    question: '',
    choices: ['', '', '', ''],
    correctAnswer: '',
    score: 10,
  })
  const [numberOfChoices, setNumberOfChoices] = useState(4)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null)
  const [config, setConfig] = useState<GameConfig>({ questionsPerRound: 20 })
  const [configLoading, setConfigLoading] = useState(true)

  // Fetch all questions
  const fetchQuestions = async () => {
    try {
      const response = await fetch('/iq-questions/api/questions/')
      if (response.ok) {
        const data = await response.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch game configuration
  const fetchConfig = async () => {
    try {
      const response = await fetch('/iq-questions/api/config/')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  // Update game configuration
  const updateConfig = async (newConfig: GameConfig) => {
    try {
      const response = await fetch('/iq-questions/api/config/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        alert('Configuration updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update configuration')
      }
    } catch (error) {
      alert('Failed to update configuration')
    }
  }

  useEffect(() => {
    fetchQuestions()
    fetchConfig()
  }, [])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'score' ? parseInt(value) || 0 : value,
    }))
  }

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...formData.choices]
    newChoices[index] = value
    setFormData(prev => ({ ...prev, choices: newChoices }))
  }

  // Handle number of choices change
  const handleNumberOfChoicesChange = (count: number) => {
    if (count < 2) count = 2
    if (count > 10) count = 10
    
    setNumberOfChoices(count)
    const currentChoices = [...formData.choices]
    
    // Adjust choices array to match new count
    if (count > currentChoices.length) {
      // Add empty choices
      const newChoices = [...currentChoices, ...Array(count - currentChoices.length).fill('')]
      setFormData(prev => ({ ...prev, choices: newChoices }))
    } else if (count < currentChoices.length) {
      // Remove extra choices
      const newChoices = currentChoices.slice(0, count)
      setFormData(prev => ({ 
        ...prev, 
        choices: newChoices,
        // Clear correct answer if it was in a removed choice
        correctAnswer: newChoices.includes(prev.correctAnswer) ? prev.correctAnswer : ''
      }))
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      question: '',
      choices: ['', '', '', ''],
      correctAnswer: '',
      score: 10,
    })
    setNumberOfChoices(4)
    setEditingId(null)
    setShowForm(false)
  }

  // Create new question
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const filteredChoices = formData.choices.filter(c => c.trim() !== '')
    
    try {
      const response = await fetch('/iq-questions/api/questions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: formData.question,
          choices: filteredChoices,
          correctAnswer: formData.correctAnswer,
          score: formData.score,
        }),
      })

      if (response.ok) {
        resetForm()
        fetchQuestions()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create question')
      }
    } catch (error) {
      alert('Failed to create question')
    }
  }

  // Start editing
  const handleEdit = (question: Question) => {
    const choiceCount = question.choices.length
    setNumberOfChoices(choiceCount)
    setFormData({
      question: question.question,
      choices: [...question.choices],
      correctAnswer: question.correctAnswer,
      score: question.score,
    })
    setEditingId(question.id)
    setShowForm(true)
  }

  // Update question
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingId) return

    const filteredChoices = formData.choices.filter(c => c.trim() !== '')
    
    try {
      const response = await fetch(`/iq-questions/api/questions/${editingId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: formData.question,
          choices: filteredChoices,
          correctAnswer: formData.correctAnswer,
          score: formData.score,
        }),
      })

      if (response.ok) {
        resetForm()
        fetchQuestions()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update question')
      }
    } catch (error) {
      alert('Failed to update question')
    }
  }

  // Show delete confirmation modal
  const handleDeleteClick = (id: number) => {
    setQuestionToDelete(id)
    setShowDeleteModal(true)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!questionToDelete) return

    try {
      const response = await fetch(`/iq-questions/api/questions/${questionToDelete}/`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchQuestions()
        setShowDeleteModal(false)
        setQuestionToDelete(null)
      } else {
        alert('Failed to delete question')
      }
    } catch (error) {
      alert('Failed to delete question')
    }
  }

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setQuestionToDelete(null)
  }

  if (loading) {
    return (
      <div className="container config-page">
        <div className="config-page-header">
          <h1>Questions Configuration</h1>
          <Link href="/" className="back-link">← Back to Quiz</Link>
        </div>
        <div className="config-page-content">
          <div className="loading">Loading</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container config-page">
      <div className="config-page-header">
        <h1>Questions Configuration</h1>
        <Link href="/" className="back-link">← Back to Quiz</Link>
      </div>
      
      <div className="config-page-content">

      {/* Game Configuration Section */}
      <div className="form-container" style={{ marginBottom: '30px' }}>
        <h2>Game Configuration</h2>
        <div className="form-group">
          <label>Number of Questions per Round:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
            <input
              type="number"
              min="1"
              max={questions.length || 999}
              value={config.questionsPerRound}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                const maxQuestions = Math.max(1, questions.length || 999)
                const clampedValue = Math.min(Math.max(1, value), maxQuestions)
                setConfig({ ...config, questionsPerRound: clampedValue })
              }}
              style={{
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                width: '100px',
                textAlign: 'center'
              }}
            />
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              (Maximum: {questions.length || 0} available questions)
            </span>
            <button
              type="button"
              className="submit-button"
              onClick={() => updateConfig(config)}
              disabled={configLoading}
              style={{ marginLeft: 'auto' }}
            >
              Save Configuration
            </button>
          </div>
          <p style={{ marginTop: '10px', color: '#64748b', fontSize: '0.9rem' }}>
            This setting controls how many questions will be asked in each game round. 
            Questions will be selected from the available questions in order.
          </p>
        </div>
      </div>

      <button className="add-button" onClick={() => setShowForm(true)}>
        + Add New Question
      </button>

      {/* Question Form Modal/Popup */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content question-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Question' : 'Create New Question'}</h3>
              <button 
                type="button" 
                className="modal-close-button"
                onClick={resetForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={editingId ? handleUpdate : handleCreate}>
                <div className="form-group">
                  <label>Question:</label>
                  <textarea
                    name="question"
                    value={formData.question}
                    onChange={handleInputChange}
                    required
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Number of Choices:</label>
                  <div className="choices-count-control">
                    <button
                      type="button"
                      className="count-button"
                      onClick={() => handleNumberOfChoicesChange(numberOfChoices - 1)}
                      disabled={numberOfChoices <= 2}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={numberOfChoices}
                      onChange={(e) => handleNumberOfChoicesChange(parseInt(e.target.value) || 2)}
                      className="count-input"
                    />
                    <button
                      type="button"
                      className="count-button"
                      onClick={() => handleNumberOfChoicesChange(numberOfChoices + 1)}
                      disabled={numberOfChoices >= 10}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Choices:</label>
                  {formData.choices.slice(0, numberOfChoices).map((choice, index) => (
                    <input
                      key={index}
                      type="text"
                      value={choice}
                      onChange={(e) => handleChoiceChange(index, e.target.value)}
                      placeholder={`Choice ${index + 1}`}
                      required={index < 2}
                    />
                  ))}
                </div>

                <div className="form-group">
                  <label>Correct Answer:</label>
                  <select
                    name="correctAnswer"
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    required
                  >
                    <option value="">Select correct answer</option>
                    {formData.choices
                      .filter(c => c.trim() !== '')
                      .map((choice, index) => (
                        <option key={index} value={choice}>
                          {choice}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Score:</label>
                  <input
                    type="number"
                    name="score"
                    value={formData.score}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-button">
                    {editingId ? 'Update Question' : 'Create Question'}
                  </button>
                  <button type="button" className="cancel-button" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="questions-list">
        <h2>All Questions ({questions.length})</h2>
        {questions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
            No questions yet. Create your first question!
          </p>
        ) : (
          <div className="questions-grid">
            {questions.map((q) => (
              <div key={q.id} className="question-card">
                <div className="question-header">
                  <span className="question-id">ID: {q.id}</span>
                  <span className="question-score">Score: {q.score}</span>
                </div>
                <div className="question-text">{q.question}</div>
                <div className="question-choices">
                  <strong>Choices:</strong>
                  <ul>
                    {q.choices.map((choice, idx) => (
                      <li key={idx} className={choice === q.correctAnswer ? 'correct-choice' : ''}>
                        {choice} {choice === q.correctAnswer && '✓'}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="question-actions">
                  <button className="edit-button" onClick={() => handleEdit(q)}>
                    Edit
                  </button>
                  <button className="delete-button" onClick={() => handleDeleteClick(q.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this question? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel-button" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="modal-confirm-button" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default function ConfigPage() {
  const searchParams = useSearchParams()
  const supervisorId = searchParams.get('supervisorId')
  const appId = searchParams.get('appId') || APP_KEY

  // Track page usage if opened from supervisor portal
  usePageTracking({
    pageId: `app-config-${appId}`,
    pageName: 'IQ Questions Config',
    pageType: 'config',
    appId,
    supervisorId: supervisorId || undefined,
    userRole: 'supervisor',
    enabled: !!supervisorId && !!appId,
    metadata: {
      source: 'app-config-page',
      appName: 'IQ Questions',
    },
  })

  return (
    <AccessCodeGate requiredRole="supervisor">
      <ConfigPageContent />
    </AccessCodeGate>
  )
}

