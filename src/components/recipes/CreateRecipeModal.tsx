'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChefHat, Sparkles, Check, Clock, Users, ClipboardPaste } from 'lucide-react';
import { sound } from '@/lib/audio';

interface CreateRecipeModalProps {
  isOpen: boolean;
  editingRecipe?: any | null;
  onClose: () => void;
  onRecipeCreated: () => void;
}

interface IngredientInput {
  name: string;
  amount: number;
  unit: string;
  category: string;
}

export function CreateRecipeModal({ isOpen, editingRecipe, onClose, onRecipeCreated }: CreateRecipeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [prepTime, setPrepTime] = useState(10);
  const [cookTime, setCookTime] = useState(15);
  const [servings, setServings] = useState(2);
  const [tags, setTags] = useState('Homemade,Quick');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: 'Egg', amount: 2, unit: 'piece', category: 'dairy' },
    { name: 'Butter', amount: 15, unit: 'g', category: 'dairy' },
  ]);
  const [steps, setSteps] = useState<string[]>([
    'Melt butter in skillet over medium heat.',
    'Crack eggs into the pan and cook to desired doneness.',
  ]);
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteSteps, setShowPasteSteps] = useState(false);
  const [pasteStepsText, setPasteStepsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when opening for Edit vs Create
  useEffect(() => {
    if (!isOpen) return;

    if (editingRecipe) {
      setTitle(editingRecipe.title || '');
      setDescription(editingRecipe.description || '');
      setImageUrl(editingRecipe.imageUrl || '');
      setPrepTime(editingRecipe.prepTimeMinutes ?? 10);
      setCookTime(editingRecipe.cookTimeMinutes ?? 15);
      setServings(editingRecipe.servings ?? 2);
      setTags(editingRecipe.tags || 'Custom');

      if (Array.isArray(editingRecipe.ingredients) && editingRecipe.ingredients.length > 0) {
        setIngredients(
          editingRecipe.ingredients.map((ing: any) => ({
            name: ing.name || '',
            amount: Number(ing.amount) || 1,
            unit: ing.unit || 'piece',
            category: ing.category || 'produce',
          }))
        );
      } else {
        setIngredients([{ name: '', amount: 1, unit: 'piece', category: 'produce' }]);
      }

      if (Array.isArray(editingRecipe.instructions) && editingRecipe.instructions.length > 0) {
        setSteps(editingRecipe.instructions);
      } else if (typeof editingRecipe.instructions === 'string' && editingRecipe.instructions.trim()) {
        try {
          const parsed = JSON.parse(editingRecipe.instructions);
          setSteps(Array.isArray(parsed) && parsed.length > 0 ? parsed : [editingRecipe.instructions]);
        } catch {
          setSteps([editingRecipe.instructions]);
        }
      } else {
        setSteps(['']);
      }
    } else {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setPrepTime(10);
      setCookTime(15);
      setServings(2);
      setTags('Homemade,Quick');
      setIngredients([
        { name: 'Egg', amount: 2, unit: 'piece', category: 'dairy' },
        { name: 'Butter', amount: 15, unit: 'g', category: 'dairy' },
      ]);
      setSteps([
        'Melt butter in skillet over medium heat.',
        'Crack eggs into the pan and cook to desired doneness.',
      ]);
    }
    setShowSmartPaste(false);
    setPasteText('');
    setShowPasteSteps(false);
    setPasteStepsText('');
  }, [isOpen, editingRecipe]);

  if (!isOpen) return null;

  const isEditing = Boolean(editingRecipe);

  const handleAddIngredient = () => {
    sound.playPop();
    setIngredients((prev) => [...prev, { name: '', amount: 1, unit: 'piece', category: 'produce' }]);
  };

  const handleRemoveIngredient = (idx: number) => {
    sound.playPop();
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateIngredient = (idx: number, field: keyof IngredientInput, val: any) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: val } : ing))
    );
  };

  const handleAddStep = () => {
    sound.playPop();
    setSteps((prev) => [...prev, '']);
  };

  const handleRemoveStep = (idx: number) => {
    sound.playPop();
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateStep = (idx: number, val: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? val : s)));
  };

  // Smart parser for pasted ingredient lines (e.g. "2 tbsp light soy sauce" or "3 cloves garlic")
  const handleParsePastedIngredients = () => {
    if (!pasteText.trim()) return;
    sound.playPop();
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(Boolean);

    const parsed: IngredientInput[] = lines.map((line) => {
      const match = line.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|tbsp|tsp|cup|cups|piece|pieces|pc|clove|cloves|slice|slices|pack|can)?\s+(?:of\s+)?(.+)$/i);
      if (match) {
        return {
          amount: parseFloat(match[1]) || 1,
          unit: (match[2] || 'piece').toLowerCase(),
          name: match[3].trim(),
          category: 'produce',
        };
      }
      return {
        name: line,
        amount: 1,
        unit: 'piece',
        category: 'produce',
      };
    });

    if (parsed.length > 0) {
      setIngredients(parsed);
      setShowSmartPaste(false);
      setPasteText('');
    }
  };

  // Smart parser for pasted cooking steps
  const handleParsePastedSteps = () => {
    if (!pasteStepsText.trim()) return;
    sound.playPop();
    const lines = pasteStepsText
      .split(/\r?\n/)
      .map((l) => l.replace(/^(?:step\s*\d+[:.)]?|\d+[.)]|[-•*])\s*/i, '').trim())
      .filter(Boolean);

    if (lines.length > 0) {
      setSteps(lines);
      setShowPasteSteps(false);
      setPasteStepsText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || ingredients.length === 0) return;

    setIsSubmitting(true);
    sound.playDing();
    try {
      const res = await fetch('/api/recipes', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecipe?.id,
          title,
          description,
          imageUrl: imageUrl.trim() || null,
          prepTimeMinutes: prepTime,
          cookTimeMinutes: cookTime,
          servings,
          tags,
          instructions: steps.filter((s) => s.trim().length > 0),
          ingredients: ingredients.filter((ing) => ing.name.trim().length > 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRecipeCreated();
        onClose();
      }
    } catch (e) {
      console.error('Failed to save recipe:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickStapleChips = [
    'Egg',
    'Garlic',
    'Onion',
    'Chicken',
    'Ginger',
    'Light Soy Sauce',
    'Dark Soy Sauce',
    'Oyster Sauce',
    'Shiitake Mushroom',
    'Yee Mee',
    'Rice',
    'Pasta',
    'Tomato',
    'Spinach',
    'Butter',
    'Cheese',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-2xl p-4 sm:p-8 max-w-2xl w-full border border-[#e8e2d8] shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3.5 mb-6 pb-4 border-b border-[#e8e2d8]">
          <div className="w-11 h-11 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold text-lg border border-[#f0d9cf]">
            <ChefHat className="w-5 h-5 text-[#cc5a35]" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium text-[#201b16]">
              {isEditing ? 'Edit Recipe' : 'Recipe Authoring Studio'}
            </h3>
            <p className="font-sans text-sm text-[#796f64]">
              {isEditing
                ? `Updating "${editingRecipe?.title}" and recalculating pantry matches`
                : 'Record your recipes with live pantry ingredient tagging'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title & Description */}
          <div>
            <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
              Recipe Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sizzling Yee Mee with Chicken"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                Description / Source Notes
              </label>
              <input
                type="text"
                placeholder="e.g. KL Foodie Claypot style..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                Dish Photo URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>
          </div>

          {/* Time & Servings */}
          <div className="grid grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-[#cc5a35]" />
                <span>Prep (min)</span>
              </label>
              <input
                type="number"
                min="0"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] text-center focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-[#cc5a35]" />
                <span>Cook (min)</span>
              </label>
              <input
                type="number"
                min="0"
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] text-center focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-[#cc5a35]" />
                <span>Servings</span>
              </label>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] text-center focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>
          </div>

          {/* Ingredients Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                Required Ingredients ({ingredients.length})
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSmartPaste(!showSmartPaste)}
                  className="flex items-center space-x-1 text-xs font-sans font-medium text-[#685f54] hover:text-[#201b16] bg-white px-2.5 py-1 rounded-lg border border-[#e8e2d8]"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-[#cc5a35]" />
                  <span>{showSmartPaste ? 'Hide Paste Box' : 'Paste Ingredient List'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="flex items-center space-x-1 text-sm font-sans font-semibold text-[#cc5a35] hover:text-[#9e3a19]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Ingredient</span>
                </button>
              </div>
            </div>

            {/* Smart Paste Box */}
            {showSmartPaste && (
              <div className="mb-3 p-3.5 bg-white rounded-xl border border-[#e8e2d8] space-y-2">
                <p className="text-xs font-sans text-[#685f54]">
                  Paste one ingredient per line (e.g. <code>2 tbsp light soy sauce</code>, <code>3 cloves garlic</code>):
                </p>
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"200 g chicken\n3 cloves garlic\n2 tbsp light soy sauce\n1 tbsp oyster sauce"}
                  className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e2d8] rounded-lg text-sm font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleParsePastedIngredients}
                    className="px-3.5 py-1.5 bg-[#201b16] text-white text-xs font-sans font-medium rounded-lg hover:bg-[#383129]"
                  >
                    Replace Ingredients with Pasted List
                  </button>
                </div>
              </div>
            )}

            {/* Quick chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-none">
              <span className="text-xs font-sans font-medium text-[#8c8276] whitespace-nowrap">Quick Add:</span>
              {quickStapleChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    setIngredients((prev) => [
                      ...prev,
                      { name: chip, amount: 1, unit: 'piece', category: 'produce' },
                    ]);
                  }}
                  className="px-2.5 py-1 bg-[#faeee8] hover:bg-[#f5e3db] text-[#8a3319] text-xs font-sans font-medium rounded-lg border border-[#f0d9cf] whitespace-nowrap transition-colors"
                >
                  +{chip}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Ingredient name (e.g. Garlic, Yee Mee)"
                    required
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="Qty"
                    required
                    value={ing.amount}
                    onChange={(e) => handleUpdateIngredient(idx, 'amount', Number(e.target.value))}
                    className="w-20 px-2.5 py-2 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] text-center focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    required
                    value={ing.unit}
                    onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                    className="w-24 px-2.5 py-2 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="p-2 text-[#9e9488] hover:text-[#b34b29] hover:bg-[#faeee8] rounded-lg transition-colors"
                      title="Remove ingredient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Instructions Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                Step-by-Step Instructions ({steps.length})
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPasteSteps(!showPasteSteps)}
                  className="flex items-center space-x-1 text-xs font-sans font-medium text-[#685f54] hover:text-[#201b16] bg-white px-2.5 py-1 rounded-lg border border-[#e8e2d8]"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-[#cc5a35]" />
                  <span>{showPasteSteps ? 'Hide Paste Box' : 'Paste Steps'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="flex items-center space-x-1 text-sm font-sans font-semibold text-[#cc5a35] hover:text-[#9e3a19]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Step</span>
                </button>
              </div>
            </div>

            {showPasteSteps && (
              <div className="mb-3 p-3.5 bg-white rounded-xl border border-[#e8e2d8] space-y-2">
                <p className="text-xs font-sans text-[#685f54]">
                  Paste cooking steps (one step per line or paragraph):
                </p>
                <textarea
                  rows={4}
                  value={pasteStepsText}
                  onChange={(e) => setPasteStepsText(e.target.value)}
                  placeholder={"1. Heat oil and sauté garlic and ginger until fragrant.\n2. Add chicken and stir-fry with soy sauce and oyster sauce.\n3. Pour over yee mee on sizzling plate and crack an egg."}
                  className="w-full px-3 py-2 bg-[#faf8f5] border border-[#e8e2d8] rounded-lg text-sm font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleParsePastedSteps}
                    className="px-3.5 py-1.5 bg-[#201b16] text-white text-xs font-sans font-medium rounded-lg hover:bg-[#383129]"
                  >
                    Replace Steps with Pasted Text
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#faeee8] border border-[#f0d9cf] text-[#8a3319] text-xs font-sans font-semibold flex items-center justify-center flex-shrink-0 mt-1.5">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    required
                    placeholder={`Step ${idx + 1} instructions...`}
                    value={step}
                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                  />
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      className="p-2 text-[#9e9488] hover:text-[#b34b29] hover:bg-[#faeee8] rounded-lg mt-1 transition-colors"
                      title="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-[#e8e2d8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-sans font-medium text-[#685f54] hover:bg-[#f0ebe1] rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-sm font-sans font-medium rounded-xl shadow-xs active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Recipe Changes'
                  : 'Save to Cook Book'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
