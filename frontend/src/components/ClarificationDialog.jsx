import { useState } from 'react';

/**
 * Clarification Dialog - Displays Creative Director's questions and collects user answers
 * @param {Array} questions - Questions from Creative Director
 * @param {Function} onSubmit - Callback with answers object
 * @param {Function} onCancel - Callback when user cancels
 */
function ClarificationDialog({ questions, onSubmit, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerChange = (questionKey, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  const handleSubmit = async () => {
    // Validate that all questions are answered
    const unanswered = questions.filter(q => !answers[q.key]);
    if (unanswered.length > 0) {
      alert('Please answer all questions before continuing');
      return;
    }

    setIsSubmitting(true);
    await onSubmit(answers);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
            🎨
          </div>
          <div>
            <h3 className="text-xl font-bold">Creative Director Needs Your Input</h3>
            <p className="text-sm text-gray-400 mt-1">
              To create the perfect campaign, I need a few more details from you.
            </p>
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto space-y-5 mb-6">
          {questions.map((question, index) => (
            <div key={question.key || index} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <label className="block">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-purple-400 font-semibold text-sm">Q{index + 1}:</span>
                  <span className="text-white font-medium flex-1">{question.question}</span>
                </div>

                {/* Multiple Choice */}
                {question.type === 'choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        onClick={() => handleAnswerChange(question.key, option)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          answers[question.key] === option
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            answers[question.key] === option
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-500'
                          }`}>
                            {answers[question.key] === option && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Text Input */}
                {question.type === 'text' && (
                  <textarea
                    value={answers[question.key] || ''}
                    onChange={(e) => handleAnswerChange(question.key, e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none h-24 placeholder:text-gray-500"
                  />
                )}

                {/* Default to text input if no type specified */}
                {!question.type && (
                  <input
                    type="text"
                    value={answers[question.key] || ''}
                    onChange={(e) => handleAnswerChange(question.key, e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full px-4 py-3 bg-white/5 text-white border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-500"
                  />
                )}
              </label>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || questions.some(q => !answers[q.key])}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '⏳ Processing...' : '✨ Continue Generation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClarificationDialog;
