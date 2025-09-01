import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Play, Square, CheckCircle, Calendar, Target, BookOpen, Briefcase } from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  page: string;
  icon: React.ReactNode;
  action?: () => void;
  highlight?: string;
}

const guideSteps: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Boardly Demo!',
    description: 'Hi Sarah! This interactive guide will show you all the powerful features of Boardly. You have 5 projects with 44 tasks already set up to demonstrate the full capabilities.',
    page: '/',
    icon: <Play className="w-6 h-6" />
  },
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    description: 'Your dashboard provides a bird\'s eye view of all your projects. See project progress, recent activity, and upcoming deadlines at a glance.',
    target: '.dashboard-content',
    page: '/',
    icon: <Square className="w-6 h-6" />
  },
  {
    id: 'projects-view',
    title: 'Projects Management',
    description: 'View all your projects here. You have 5 diverse projects: a large CRM migration, marketing campaign, home office renovation, research analysis, and urgent security audit.',
    page: '/projects',
    icon: <Briefcase className="w-6 h-6" />
  },
  {
    id: 'kanban-boards',
    title: 'Kanban Boards',
    description: 'Each project has its own kanban board with customized columns. Drag and drop tasks between columns to track progress visually.',
    page: '/projects/101',
    target: '.kanban-board',
    icon: <Target className="w-6 h-6" />
  },
  {
    id: 'task-management',
    title: 'Task Management',
    description: 'Tasks have priorities (urgent, high, medium, low), due dates, descriptions, and can have dependencies. Right-click tasks for quick actions.',
    page: '/my-tasks',
    target: '.task-list',
    icon: <CheckCircle className="w-6 h-6" />
  },
  {
    id: 'calendar-events',
    title: 'Calendar & Events',
    description: 'View all your deadlines, meetings, and events in a beautiful calendar interface. Events are linked to projects and show different types (meeting, deadline, event).',
    page: '/calendar',
    target: '.calendar-view',
    icon: <Calendar className="w-6 h-6" />
  },
  {
    id: 'diary-reflection',
    title: 'Diary & Reflection',
    description: 'Keep track of your thoughts, meeting notes, decisions, and follow-ups. Entries are categorized and searchable.',
    page: '/diary',
    target: '.diary-entries',
    icon: <BookOpen className="w-6 h-6" />
  }
];

export const DemoGuide: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  // Check if current user is demo user
  const isDemoUser = user?.email === 'demo@taskmanager.com';

  useEffect(() => {
    if (isDemoUser) {
      const seen = localStorage.getItem('demo-guide-seen');
      setHasSeenGuide(!!seen);
      
      // Auto-start guide for first-time demo users
      if (!seen) {
        setTimeout(() => setIsActive(true), 1000);
      }
    }
  }, [isDemoUser]);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    }
  }, [isActive]);

  const currentGuideStep = guideSteps[currentStep];

  const handleNext = useCallback(() => {
    if (currentStep < guideSteps.length - 1) {
      const nextStep = guideSteps[currentStep + 1];
      if (nextStep.page !== location.pathname) {
        navigate(nextStep.page);
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  }, [currentStep, location.pathname, navigate]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = guideSteps[currentStep - 1];
      if (prevStep.page !== location.pathname) {
        navigate(prevStep.page);
      }
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, location.pathname, navigate]);

  const handleClose = useCallback(() => {
    setIsActive(false);
    setIsVisible(false);
    localStorage.setItem('demo-guide-seen', 'true');
    setHasSeenGuide(true);
  }, []);

  const handleStepClick = useCallback((stepIndex: number) => {
    const step = guideSteps[stepIndex];
    if (step.page !== location.pathname) {
      navigate(step.page);
    }
    setCurrentStep(stepIndex);
  }, [location.pathname, navigate]);

  const startGuide = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    if (guideSteps[0].page !== location.pathname) {
      navigate(guideSteps[0].page);
    }
  }, [location.pathname, navigate]);

  // Auto-navigate when step changes and we're active
  useEffect(() => {
    if (isActive && currentGuideStep.page !== location.pathname) {
      navigate(currentGuideStep.page);
    }
  }, [currentStep, isActive, currentGuideStep.page, location.pathname, navigate]);

  // Highlight elements when step changes
  useEffect(() => {
    if (isActive && currentGuideStep.target) {
      const element = document.querySelector(currentGuideStep.target);
      if (element) {
        element.classList.add('demo-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        return () => {
          element.classList.remove('demo-highlight');
        };
      }
    }
  }, [currentStep, isActive, currentGuideStep.target]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleNext, handlePrev, handleClose]);

  if (!isDemoUser) return null;

  return (
    <>
      {/* Guide Toggle Button */}
      {!isActive && (
        <button
          onClick={startGuide}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-40 group"
        >
          <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-2 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Start Demo Guide
          </span>
        </button>
      )}

      {/* Guide Modal */}
      {isVisible && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                {currentGuideStep.icon}
                <div>
                  <h2 className="text-xl font-bold">{currentGuideStep.title}</h2>
                  <p className="text-blue-100">
                    Step {currentStep + 1} of {guideSteps.length}
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / guideSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                {currentGuideStep.description}
              </p>

              {/* Step Navigation Dots */}
              <div className="flex justify-center space-x-2 mb-6">
                {guideSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleStepClick(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'bg-blue-500 scale-125'
                        : index < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Skip Guide
                  </button>
                  
                  <button
                    onClick={handleNext}
                    className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    <span>{currentStep === guideSteps.length - 1 ? 'Finish' : 'Next'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for highlighting */}
      <style>{`
        @keyframes demo-highlight {
          0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3); }
        }
        
        .demo-highlight {
          position: relative;
          z-index: 30;
          border-radius: 8px;
          animation: demo-highlight 2s infinite;
        }
        
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .animate-in {
          animation: animate-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};