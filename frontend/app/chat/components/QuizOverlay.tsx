'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowRight, Award } from 'lucide-react'

export interface QuizQuestion {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
}

interface QuizOverlayProps {
    questions: QuizQuestion[]
    onComplete: (score: number) => void
    onClose: () => void
}

export function QuizOverlay({ questions, onComplete, onClose }: QuizOverlayProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isAnswered, setIsAnswered] = useState(false)
    const [score, setScore] = useState(0)
    const [showResults, setShowResults] = useState(false)

    const currentQuestion = questions[currentIndex]

    const handleOptionSelect = (index: number) => {
        if (isAnswered) return
        setSelectedOption(index)
    }

    const handleConfirm = () => {
        if (selectedOption === null) return

        const correct = selectedOption === currentQuestion.correctAnswer
        if (correct) setScore(prev => prev + 1)
        setIsAnswered(true)
    }

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setSelectedOption(null)
            setIsAnswered(false)
        } else {
            setShowResults(true)
        }
    }

    const handleFinish = () => {
        onComplete(score)
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                >
                    {!showResults ? (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-zinc-500 text-sm font-medium">Question {currentIndex + 1} of {questions.length}</span>
                                <div className="h-1.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-blue-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <h2 className="text-xl font-semibold text-white mb-8">
                                {currentQuestion.question}
                            </h2>

                            <div className="space-y-3 mb-8">
                                {currentQuestion.options.map((option, index) => {
                                    let borderColor = 'border-zinc-800'
                                    let bgColor = 'bg-zinc-800/50'
                                    let textColor = 'text-zinc-300'

                                    if (selectedOption === index) {
                                        borderColor = 'border-blue-500'
                                        bgColor = 'bg-blue-500/10'
                                        textColor = 'text-blue-400'
                                    }

                                    if (isAnswered) {
                                        if (index === currentQuestion.correctAnswer) {
                                            borderColor = 'border-emerald-500'
                                            bgColor = 'bg-emerald-500/10'
                                            textColor = 'text-emerald-400'
                                        } else if (selectedOption === index) {
                                            borderColor = 'border-red-500'
                                            bgColor = 'bg-red-500/10'
                                            textColor = 'text-red-400'
                                        }
                                    }

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => handleOptionSelect(index)}
                                            disabled={isAnswered}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 outline-none ${borderColor} ${bgColor} ${textColor} hover:scale-[1.01] active:scale-[0.99]`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{option}</span>
                                                {isAnswered && index === currentQuestion.correctAnswer && <CheckCircle2 size={18} />}
                                                {isAnswered && index === selectedOption && index !== currentQuestion.correctAnswer && <XCircle size={18} />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {isAnswered && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-zinc-800/30 rounded-xl mb-8 border border-zinc-700/50"
                                >
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                        <span className="font-bold text-zinc-200">Explanation:</span> {currentQuestion.explanation}
                                    </p>
                                </motion.div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-zinc-800">
                                {!isAnswered ? (
                                    <button
                                        onClick={handleConfirm}
                                        disabled={selectedOption === null}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        Check Answer
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNext}
                                        className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-medium transition-colors flex items-center gap-2"
                                    >
                                        {currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
                                        <ArrowRight size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 10 }}
                                className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <Award size={40} />
                            </motion.div>
                            <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
                            <p className="text-zinc-400 mb-8">
                                You scored <span className="text-white font-bold">{score}</span> out of <span className="text-white font-bold">{questions.length}</span>
                            </p>

                            <div className="p-4 bg-blue-500/10 rounded-xl mb-8 border border-blue-500/20">
                                <p className="text-sm text-blue-300">
                                    {score === questions.length
                                        ? "Perfect! You've mastered these concepts."
                                        : "Great effort! Review the explanations to strengthen your skills."}
                                </p>
                            </div>

                            <button
                                onClick={handleFinish}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Continue Learning
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
