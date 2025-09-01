import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Star, Heart, Zap, Users, Shield, Plus, Calendar, CheckCircle, X, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { goalsAPI } from '../lib/api';

interface Goal {
  id: number;
  title: string;
  description: string;
  category: string;
  completed: boolean;
  target_date: string;
  created_at: string;
}

const categoryIcons: { [key: string]: any } = {
  'Professional Development': { icon: TrendingUp, color: 'blue', emoji: '💼' },
  'Career Achievement': { icon: Star, color: 'purple', emoji: '⭐' },
  'Personal Development': { icon: Heart, color: 'pink', emoji: '🌱' },
  'Skill Development': { icon: Zap, color: 'yellow', emoji: '⚡' },
  'Leadership': { icon: Users, color: 'green', emoji: '👥' },
  'Personal Well-being': { icon: Shield, color: 'emerald', emoji: '🧘' },
};

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredGoal, setHoveredGoal] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  
  // Form state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const response = await goalsAPI.getAll();
      // Convert SQLite integers (0/1) to booleans
      const goalsWithBooleans = response.data.map((goal: Goal) => ({
        ...goal,
        completed: Boolean(goal.completed)
      }));
      setGoals(goalsWithBooleans);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalCategory || !newGoalTargetDate) return;
    
    setCreating(true);
    try {
      const response = await goalsAPI.create({
        title: newGoalTitle,
        description: newGoalDescription || undefined,
        category: newGoalCategory,
        completed: false,
        target_date: newGoalTargetDate,
      });
      
      setGoals([response.data, ...goals]);
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to create goal:', error);
      alert('Failed to create goal. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleComplete = async (goal: Goal) => {
    console.log('=== GOAL TOGGLE DEBUG ===');
    console.log('Button clicked for goal:', goal.id, goal.title);
    console.log('Current completed status:', goal.completed, typeof goal.completed);
    console.log('Will toggle to:', !goal.completed);
    
    try {
      const updateData = {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        completed: !goal.completed,
        target_date: goal.target_date,
      };
      console.log('Sending update data:', updateData);
      console.log('API URL will be: PUT /goals/' + goal.id);
      
      console.log('Making API call...');
      console.log('Final API call: PUT /goals/' + goal.id);
      console.log('Request payload:', JSON.stringify(updateData, null, 2));
      
      const response = await goalsAPI.update(String(goal.id), updateData);
      console.log('API call successful! Response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      console.log('Response completed field:', response.data.completed, typeof response.data.completed);
      
      // Convert SQLite integer response to boolean
      const updatedGoal = {
        ...response.data,
        completed: Boolean(response.data.completed)
      };
      console.log('Converted goal:', updatedGoal);
      console.log('Converted completed field:', updatedGoal.completed, typeof updatedGoal.completed);
      console.log('Updating local state...');
      
      const newGoals = goals.map(g => {
        if (g.id === goal.id) {
          console.log('Updating goal in array:', g.id, 'from completed:', g.completed, 'to completed:', updatedGoal.completed);
          return updatedGoal;
        }
        return g;
      });
      
      console.log('Old goals array length:', goals.length);
      console.log('New goals array length:', newGoals.length);
      console.log('About to call setGoals...');
      
      setGoals(newGoals);
      console.log('setGoals called successfully');
      
      // Force a re-render by updating the state again after a brief delay
      setTimeout(() => {
        console.log('Forcing re-render...');
        setGoals([...newGoals]);
      }, 100);
      
    } catch (error: any) {
      console.error('=== ERROR IN GOAL TOGGLE ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Full error:', error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      alert('Failed to update goal. Check console for details.');
    }
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setNewGoalTitle('');
    setNewGoalDescription('');
    setNewGoalCategory('');
    setNewGoalTargetDate('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };


  const getStats = () => {
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.completed).length;
    
    return { totalGoals, completedGoals };
  };

  const filteredGoals = showCompleted ? goals : goals.filter(g => !g.completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Target className="h-10 w-10 text-blue-600" />
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Personal & Professional Goals</h1>
                <p className="text-gray-600 text-lg mt-2">Track your progress and achieve your aspirations</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCompleted(!showCompleted)}
                variant="outline"
                className="flex items-center gap-2"
              >
                {showCompleted ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Completed
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show Completed
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalGoals}</p>
                  <p className="text-sm text-blue-700">Total Goals</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{stats.completedGoals}</p>
                  <p className="text-sm text-green-700">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              {goals.length === 0 ? "No goals yet" : showCompleted ? "No goals found" : "No active goals"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {goals.length === 0 ? "Start setting goals to track your progress" : 
               showCompleted ? "Try adjusting your filters" : "All your goals are completed! Great job!"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGoals.map((goal, index) => {
              const categoryInfo = categoryIcons[goal.category] || { icon: Target, color: 'gray', emoji: '🎯' };
              const IconComponent = categoryInfo.icon;
              
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  onHoverStart={() => setHoveredGoal(goal.id)}
                  onHoverEnd={() => setHoveredGoal(null)}
                  className="group cursor-pointer"
                >
                  <Card className={`h-full bg-white transition-all duration-300 shadow-md hover:shadow-xl ${
                    goal.completed 
                      ? 'border border-green-200 bg-green-50/30' 
                      : 'border border-gray-200 hover:border-blue-300'
                  }`}>
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-3">
                        <motion.div 
                          className={`p-3 rounded-xl ${
                            goal.completed 
                              ? 'bg-green-100 border border-green-200' 
                              : `bg-${categoryInfo.color}-50 border border-${categoryInfo.color}-200`
                          }`}
                          animate={{ scale: hoveredGoal === goal.id ? 1.1 : 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {goal.completed ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <IconComponent className={`h-6 w-6 text-${categoryInfo.color}-600`} />
                          )}
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{categoryInfo.emoji}</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              goal.completed 
                                ? 'text-green-700 bg-green-100' 
                                : `text-${categoryInfo.color}-700 bg-${categoryInfo.color}-100`
                            }`}>
                              {goal.category}
                            </span>
                          </div>
                          
                          <CardTitle className={`text-lg font-bold transition-colors line-clamp-2 ${
                            goal.completed 
                              ? 'text-green-800 line-through' 
                              : 'text-gray-900 group-hover:text-blue-700'
                          }`}>
                            {goal.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <CardDescription className={`text-sm leading-relaxed mb-4 line-clamp-3 ${
                        goal.completed ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {goal.description}
                      </CardDescription>
                      
                      {/* Status and Target Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={goal.completed ? 'text-green-600' : 'text-gray-600'}>
                            {formatDate(goal.target_date)}
                          </span>
                        </div>
                        
                        <Button
                          onClick={() => handleToggleComplete(goal)}
                          variant={goal.completed ? "outline" : "default"}
                          size="sm"
                          className={goal.completed 
                            ? "border-green-200 text-green-700 hover:bg-green-50" 
                            : "bg-blue-500 hover:bg-blue-600"
                          }
                        >
                          {goal.completed ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Completed
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Done
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Goal Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Target className="h-6 w-6 text-blue-600" />
              Create New Goal
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreateGoal} className="space-y-6">
            <div className="grid gap-4">
              {/* Goal Title */}
              <div>
                <Label htmlFor="goal-title" className="text-sm font-medium">
                  Goal Title *
                </Label>
                <Input
                  id="goal-title"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Enter your goal title..."
                  className="mt-1"
                  required
                />
              </div>

              {/* Goal Description */}
              <div>
                <Label htmlFor="goal-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="goal-description"
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  placeholder="Describe what you want to achieve..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Category and Target Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goal-category" className="text-sm font-medium">
                    Category *
                  </Label>
                  <Select value={newGoalCategory} onValueChange={setNewGoalCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(categoryIcons).map((category) => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            <span>{categoryIcons[category].emoji}</span>
                            {category}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="goal-target-date" className="text-sm font-medium">
                    Target Date *
                  </Label>
                  <Input
                    id="goal-target-date"
                    type="date"
                    value={newGoalTargetDate}
                    onChange={(e) => setNewGoalTargetDate(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseDialog}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={creating || !newGoalTitle.trim() || !newGoalCategory || !newGoalTargetDate}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {creating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {creating ? 'Creating...' : 'Create Goal'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};