# Professional Color System - Implementation Guide

## 📋 Quick Start

### 1. Theme Helper Files
- **File**: [src/utils/themeHelper.js](../../utils/themeHelper.js)
  - Generic theme helper with 50+ properties
  - Provides comprehensive styling for any component
  - Independent of specific dashboard

- **TeacherDashboard Theme**: Added `getTeacherTheme()` function in [TeacherDashboard.jsx](../../pages/TeacherDashboard.jsx#L8-L130)
  - Specialized theme for teacher-specific components
  - Uses professional color system
  - Includes tab styles, stat cards, buttons specifically for teacher duties

### 2. Color System Documents
- **Design System Doc**: [COLOR_SYSTEM.md](./COLOR_SYSTEM.md)
  - Complete color palette with hex codes
  - CSS variables setup
  - Tailwind configuration mapping
  - Usage examples for common components

- **Tailwind Config**: [tailwind-color-config.js](./tailwind-color-config.js)
  - Ready-to-use Tailwind color values
  - Import into `tailwind.config.js`
  - Includes component examples

---

## 🎨 Color Palette Overview

### Light Mode (Professional, Minimal)
```
Background:     #F9FAFB (soft off-white)
Surface/Cards:  #FFFFFF (pure white)
Primary:        #1E40AF (deep blue)
Secondary:      #0891B2 (teal)
Text Primary:   #1F2937 (dark gray)
Text Secondary: #6B7280 (medium gray)
Border:         #E5E7EB (light gray)
```

### Dark Mode (Navy + Vibrant Accents)
```
Background:     #0F172A (deep navy)
Surface/Cards:  #1E293B (navy surface)
Primary:        #3B82F6 (bright blue)
Secondary:      #06B6D4 (vibrant cyan)
Text Primary:   #F1F5F9 (near white)
Text Secondary: #CBD5E1 (soft gray)
Border:         #334155 (dark gray)
```

---

## 🚀 Usage in Components

### Method 1: Using Theme Helper Function

```jsx
import { getThemeClasses } from '../utils/themeHelper';

export function MyComponent() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = getThemeClasses(isDarkMode);

  return (
    <div className={theme.mainContainer}>
      <div className={theme.card}>
        <h1 className={theme.text.primary}>Title</h1>
        <p className={theme.text.secondary}>Subtitle</p>
        <button className={theme.button.primary}>Click me</button>
      </div>
    </div>
  );
}
```

### Method 2: Specialized Dashboard Theme

```jsx
import { useState } from 'react';

const getTeacherTheme = (isDarkMode) => ({
  mainContainer: isDarkMode 
    ? "min-h-screen bg-[#0F172A] text-[#F1F5F9]"
    : "min-h-screen bg-[#F9FAFB] text-[#1F2937]",
  // ... more properties
});

export function TeacherDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const theme = getTeacherTheme(isDarkMode);

  return <div className={theme.mainContainer}>...</div>;
}
```

### Method 3: CSS Variables (Global)

```jsx
// In index.css
@layer base {
  :root {
    --color-bg-primary: #F9FAFB;
    --color-text-primary: #1F2937;
    --color-primary: #1E40AF;
    /* ... */
  }

  html.dark {
    --color-bg-primary: #0F172A;
    --color-text-primary: #F1F5F9;
    --color-primary: #3B82F6;
  }
}

// In components
<div style={{ backgroundColor: 'var(--color-bg-primary)' }}>
  Content
</div>
```

---

## 📦 Component Patterns

### Card Pattern
```jsx
<div className={`${theme.card} rounded-lg p-4`}>
  <h3 className={theme.text.primary}>Card Title</h3>
  <p className={theme.text.secondary}>Description</p>
</div>
```

### Button Pattern
```jsx
<button className={`${theme.button.primary} px-4 py-2 rounded-lg font-medium`}>
  Primary Action
</button>

<button className={`${theme.button.secondary} px-4 py-2 rounded-lg font-medium`}>
  Secondary Action
</button>
```

### Status Badge Pattern
```jsx
<span className={`${theme.badgeSuccess} px-3 py-1 rounded-full text-sm`}>
  Success
</span>

<span className={`${theme.badgeWarning} px-3 py-1 rounded-full text-sm`}>
  Warning
</span>

<span className={`${theme.badgeDanger} px-3 py-1 rounded-full text-sm`}>
  Error
</span>
```

### Form Input Pattern
```jsx
<input 
  type="text" 
  className={`${theme.input} px-3 py-2 rounded-lg`}
  placeholder="Enter text..."
/>
```

---

## 🎯 Implementation Checklist

### Phase 1: Foundations ✅
- [x] Create generic theme helper (`themeHelper.js`)
- [x] Create color system documentation (`COLOR_SYSTEM.md`)
- [x] Create Tailwind configuration (`tailwind-color-config.js`)
- [x] Add theme to TeacherDashboard (`getTeacherTheme`)
- [x] Update TeacherDashboard header with professional colors
- [x] Update TeacherDashboard stat cards with theme

### Phase 2: Polish (Recommended Next)
- [ ] Complete TeacherDashboard color updates (tabs, buttons, forms)
- [ ] Update StudentDashboard to use professional colors
- [ ] Create shared component library with themed components
- [ ] Test theme switching performance
- [ ] Verify WCAG AA contrast ratios on all text

### Phase 3: Enhancement
- [ ] Add theme animation transitions
- [ ] Implement custom theme selector UI
- [ ] Add theme persistence to localStorage
- [ ] Create Storybook stories for themed components
- [ ] Build theme testing suite

---

## 🔄 Theme Switching

### Basic Implementation
```jsx
const [isDarkMode, setIsDarkMode] = useState(() => {
  const saved = localStorage.getItem('theme');
  return saved ? saved === 'dark' : false;
});

const toggleTheme = () => {
  setIsDarkMode(!isDarkMode);
  localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
};

useEffect(() => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [isDarkMode]);
```

### Theme Toggle Button
```jsx
<button
  onClick={toggleTheme}
  className={`${theme.buttonTheme} px-4 py-2 rounded-lg flex items-center gap-2`}
>
  {isDarkMode ? (
    <>
      <SunIcon /> Light Mode
    </>
  ) : (
    <>
      <MoonIcon /> Dark Mode
    </>
  )}
</button>
```

---

## ✨ Best Practices

### 1. **Always Use Theme Helper**
Don't hardcode colors - use the theme helper for consistency:
```jsx
// ❌ Avoid
<div className="bg-blue-600">Bad</div>

// ✅ Good
<div className={theme.buttonPrimary}>Good</div>
```

### 2. **Maintain Contrast**
All text must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text (18pt+): 3:1 contrast ratio

### 3. **Use Semantic Colors**
- `primary` - main actions and branding
- `secondary` - alternative actions
- `success` - positive feedback (green)
- `warning` - caution (amber)
- `error` - problems (red)
- `info` - information (blue)

### 4. **Respect User Preferences**
```jsx
useEffect(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  setIsDarkMode(prefersDark.matches);
}, []);
```

### 5. **Test Both Modes**
Always test components in both light and dark modes:
- [ ] Text readability
- [ ] Button visibility
- [ ] Border distinction
- [ ] Focus states
- [ ] Hover effects

---

## 🐛 Common Issues & Solutions

### Issue: Inline Colors Don't Update
**Problem**: Using hardcoded hex values instead of theme
**Solution**: Replace all inline colors with theme properties
```jsx
// ❌ Before
<div className="bg-slate-100 text-slate-900">

// ✅ After
<div className={`${theme.card} text-${theme.text.primary}`}>
```

### Issue: Poor Contrast in Dark Mode
**Problem**: Some text isn't readable on dark backgrounds
**Solution**: Use the `textPrimary` or `textSecondary` properties which are pre-validated
```jsx
// Use theme text colors
<p className={theme.text.primary}>Good contrast</p>
```

### Issue: Theme Not Persisting
**Problem**: Theme resets on page refresh
**Solution**: Store in localStorage and read on mount
```jsx
const [isDarkMode, setIsDarkMode] = useState(() => {
  return localStorage.getItem('theme') === 'dark';
});
```

---

## 📚 File Structure

```
frontend/src/
├── styles/
│   ├── COLOR_SYSTEM.md          ← Design documentation
│   └── tailwind-color-config.js ← Tailwind configuration
├── utils/
│   └── themeHelper.js           ← Generic theme helper
└── pages/
    ├── StudentDashboard.jsx     ← Uses theme system
    └── TeacherDashboard.jsx     ← Uses getTeacherTheme
```

---

## 🎓 Learning Resources

- **Tailwind CSS**: https://tailwindcss.com/docs/
- **WCAG Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/
- **Color Contrast Tool**: https://webaim.org/resources/contrastchecker/
- **Tailwind Color Reference**: https://tailwindcss.com/docs/customizing-colors

---

## 📞 Questions?

Refer to:
1. **COLOR_SYSTEM.md** - Color definitions and hex codes
2. **tailwind-color-config.js** - Tailwind setup and examples
3. **themeHelper.js** - Available theme properties
4. Existing dashboard implementations (StudentDashboard, TeacherDashboard)

