# Student Dashboard Color System

A professional, accessible color system designed for modern SaaS productivity applications. Inspired by Notion, Stripe, and Linear's design principles.

## Overview

- **Light Mode**: Soft, clean aesthetic optimized for daytime use
- **Dark Mode**: Navy-based palette for reduced eye strain
- **Accessibility**: WCAG AA compliant contrast ratios
- **Philosophy**: Minimal, professional, premium feel

---

## Light Mode Color Palette

| Component | Color | Hex Code |
|-----------|-------|----------|
| **Background** | Off-white | `#F9FAFB` |
| **Surface/Cards** | Pure white | `#FFFFFF` |
| **Dividers/Borders** | Light gray | `#E5E7EB` |
| **Borders (Subtle)** | Very light gray | `#F3F4F6` |
| **Text Primary** | Dark gray | `#1F2937` |
| **Text Secondary** | Medium gray | `#6B7280` |
| **Text Tertiary** | Light gray | `#9CA3AF` |
| **Primary Color** | Deep blue | `#1E40AF` |
| **Primary Light** | Light blue | `#DBEAFE` |
| **Primary Hover** | Medium blue | `#1D4ED8` |
| **Secondary Color** | Teal | `#0891B2` |
| **Secondary Light** | Light teal | `#CCFBF1` |
| **Secondary Hover** | Medium teal | `#0E7490` |
| **Success** | Green | `#10B981` |
| **Warning** | Amber | `#F59E0B` |
| **Error** | Red | `#EF4444` |
| **Info** | Blue | `#3B82F6` |

## Dark Mode Color Palette

| Component | Color | Hex Code |
|-----------|-------|----------|
| **Background** | Deep navy | `#0F172A` |
| **Background Alt** | Slightly lighter | `#0F1729` |
| **Surface/Cards** | Navy surface | `#1E293B` |
| **Surface Hover** | Lighter surface | `#334155` |
| **Dividers/Borders** | Dark gray | `#334155` |
| **Borders (Subtle)** | Very dark gray | `#1E293B` |
| **Text Primary** | Near white | `#F1F5F9` |
| **Text Secondary** | Soft gray | `#CBD5E1` |
| **Text Tertiary** | Medium gray | `#94A3B8` |
| **Primary Color** | Bright blue | `#3B82F6` |
| **Primary Light** | Light blue | `#1E3A8A` |
| **Primary Hover** | Lighter blue | `#60A5FA` |
| **Secondary Color** | Vibrant cyan | `#06B6D4` |
| **Secondary Light** | Light cyan | `#164E63` |
| **Secondary Hover** | Lighter cyan | `#22D3EE` |
| **Success** | Bright green | `#10B981` |
| **Warning** | Bright amber | `#FBBF24` |
| **Error** | Bright red | `#F87171` |
| **Info** | Bright blue | `#60A5FA` |

---

## CSS Variables (for easy dynamic switching)

```css
:root {
  /* Light Mode */
  --color-bg-primary: #F9FAFB;
  --color-bg-secondary: #FFFFFF;
  --color-border: #E5E7EB;
  --color-border-subtle: #F3F4F6;
  --color-text-primary: #1F2937;
  --color-text-secondary: #6B7280;
  --color-text-tertiary: #9CA3AF;
  --color-primary: #1E40AF;
  --color-primary-light: #DBEAFE;
  --color-primary-hover: #1D4ED8;
  --color-secondary: #0891B2;
  --color-secondary-light: #CCFBF1;
  --color-secondary-hover: #0E7490;
}

html[data-theme="dark"] {
  /* Dark Mode */
  --color-bg-primary: #0F172A;
  --color-bg-secondary: #1E293B;
  --color-border: #334155;
  --color-border-subtle: #1E293B;
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #CBD5E1;
  --color-text-tertiary: #94A3B8;
  --color-primary: #3B82F6;
  --color-primary-light: #1E3A8A;
  --color-primary-hover: #60A5FA;
  --color-secondary: #06B6D4;
  --color-secondary-light: #164E63;
  --color-secondary-hover: #22D3EE;
}
```

---

## Tailwind Color Mapping

Add to `tailwind.config.js`:

```javascript
colors: {
  // Light theme colors
  light: {
    bg: {
      primary: '#F9FAFB',
      secondary: '#FFFFFF',
    },
    border: '#E5E7EB',
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
    },
    primary: '#1E40AF',
    secondary: '#0891B2',
  },
  // Dark theme colors
  dark: {
    bg: {
      primary: '#0F172A',
      secondary: '#1E293B',
    },
    border: '#334155',
    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
    },
    primary: '#3B82F6',
    secondary: '#06B6D4',
  },
}
```

---

## Usage Examples

### Background Container
```jsx
// Light mode
className="bg-white"
// Dark mode
className="dark:bg-slate-900"
// With theme system
className={isDarkMode ? "bg-slate-900" : "bg-white"}
```

### Card Component
```jsx
className={`
  border rounded-lg p-4
  ${isDarkMode 
    ? "border-slate-700 bg-slate-800" 
    : "border-gray-200 bg-white"
  }
`}
```

### Button (Primary)
```jsx
className={`
  px-4 py-2 rounded-lg font-medium transition-colors
  ${isDarkMode 
    ? "bg-blue-500 text-white hover:bg-blue-600" 
    : "bg-blue-600 text-white hover:bg-blue-700"
  }
`}
```

### Button (Secondary/Outline)
```jsx
className={`
  px-4 py-2 rounded-lg font-medium border transition-colors
  ${isDarkMode 
    ? "border-slate-600 text-slate-200 hover:bg-slate-700" 
    : "border-gray-300 text-gray-800 hover:bg-gray-50"
  }
`}
```

### Text (Primary)
```jsx
className={isDarkMode ? "text-slate-100" : "text-gray-900"}
```

### Text (Secondary)
```jsx
className={isDarkMode ? "text-slate-400" : "text-gray-600"}
```

### Sidebar Item
```jsx
className={`
  px-3 py-2 rounded-lg transition-all border
  ${isDarkMode
    ? "border-slate-700 text-slate-300 hover:bg-slate-700/50"
    : "border-gray-200 text-gray-700 hover:bg-gray-100"
  }
`}
```

### Header/Navigation
```jsx
className={`
  border-b backdrop-blur-md
  ${isDarkMode 
    ? "border-slate-700 bg-slate-900/80" 
    : "border-gray-200 bg-white/80"
  }
`}
```

---

## Accessibility Considerations

- **Contrast Ratios**: All text meets WCAG AA standards (4.5:1 for normal text)
- **Color Blindness**: Avoid relying solely on color; use icons and labels
- **Focus States**: Always include visible focus indicators
- **Motion**: Respect `prefers-reduced-motion` preference

---

## Best Practices

1. **Use semantic colors**: Primary for primary actions, secondary for secondary interactions
2. **Maintain hierarchy**: Primary text darker than secondary text
3. **Consistent spacing**: Combine colors with consistent spacing for visual rhythm
4. **Limit palette**: Stick to the defined colors to maintain coherence
5. **Test contrast**: Always verify contrast in both light and dark modes
6. **Hover states**: Provide clear visual feedback on interactive elements

---

## Implementation Notes

- All colors are designed to work with Tailwind CSS
- Supports dynamic theme switching via `isDarkMode` state
- localStorage can persist theme preference
- Ensure CSS variables are loaded before React renders for smooth theme switching
