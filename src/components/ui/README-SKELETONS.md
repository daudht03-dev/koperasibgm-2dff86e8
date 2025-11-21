# 🎨 Skeleton Templates Library

Comprehensive collection of reusable skeleton loaders untuk smooth loading states di seluruh aplikasi.

## 📦 Files Created

```
src/components/ui/
├── skeleton.tsx                    # Base skeleton component (sudah ada)
├── skeleton-templates.tsx          # 11 reusable skeleton templates (BARU)
├── skeleton-templates.stories.md  # Documentation & API reference (BARU)
├── skeleton-examples.tsx           # 12 real-world examples (BARU)
└── README-SKELETONS.md            # This file (BARU)
```

---

## 🚀 Quick Start

### 1. Import Template yang Dibutuhkan

```tsx
import { 
  CardSkeleton,
  TableSkeleton,
  FormSkeleton 
} from "@/components/ui/skeleton-templates";
```

### 2. Gunakan di Loading State

```tsx
const MyComponent = () => {
  const { data, loading } = useData();

  if (loading) {
    return <CardSkeleton lines={5} />;
  }

  return <DataDisplay data={data} />;
};
```

---

## 📚 Available Templates

| Template | Use Case | Props |
|----------|----------|-------|
| **CardSkeleton** | Card components | `showHeader`, `showFooter`, `lines` |
| **TableSkeleton** | Data tables | `rows`, `columns`, `showHeader` |
| **FormSkeleton** | Forms | `fields`, `showButton`, `showTitle` |
| **ProfileSkeleton** | User profiles | `showAvatar`, `showBio`, `showStats` |
| **StatsSkeleton** | Metrics cards | `cards`, `showIcon`, `showTrend` |
| **ImageSkeleton** | Images | `aspectRatio` |
| **ListSkeleton** | Lists | `items`, `showAvatar`, `showIcon` |
| **NavSkeleton** | Navigation | `items`, `orientation` |
| **ChartSkeleton** | Charts | `type`, `showLegend` |
| **ProductCardSkeleton** | Products | `showPrice`, `showRating` |
| **CommentSkeleton** | Comments | `items`, `showReplies` |

---

## 💡 Real-World Examples

### Admin Dashboard

```tsx
import { StatsSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton-templates";

const AdminDashboard = () => {
  const { data, loading } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton cards={4} showTrend />
        
        <div className="grid grid-cols-2 gap-6">
          <ChartSkeleton type="bar" />
          <ChartSkeleton type="pie" />
        </div>
        
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  return <DashboardContent data={data} />;
};
```

### Product List

```tsx
import { ProductCardSkeleton } from "@/components/ui/skeleton-templates";

const ProductList = () => {
  const { products, loading } = useProducts();

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <ProductCardSkeleton key={i} showRating />
        ))}
      </div>
    );
  }

  return <ProductGrid products={products} />;
};
```

### Farmer Profile

```tsx
import { ProfileSkeleton, CardSkeleton } from "@/components/ui/skeleton-templates";

const FarmerProfile = () => {
  const { farmer, loading } = useFarmer(id);

  if (loading) {
    return (
      <div className="space-y-6">
        <ProfileSkeleton showStats bioLines={4} />
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} showFooter />
        </div>
      </div>
    );
  }

  return <FarmerDetails farmer={farmer} />;
};
```

### Form Page

```tsx
import { FormSkeleton } from "@/components/ui/skeleton-templates";

const EditForm = () => {
  const { data, loading } = useFormData();

  if (loading) {
    return <FormSkeleton fields={8} showTitle />;
  }

  return <EditFormContent data={data} />;
};
```

---

## 🎯 Best Practices

### 1. ✅ DO: Match Skeleton to Final Content

```tsx
// ✅ Good - Skeleton matches actual content layout
{loading ? (
  <CardSkeleton showFooter lines={3} />  // Matches actual card
) : (
  <Card>
    <CardContent>
      <p>Line 1</p>
      <p>Line 2</p>
      <p>Line 3</p>
    </CardContent>
    <CardFooter>
      <Button />
    </CardFooter>
  </Card>
)}
```

### 2. ✅ DO: Use Consistent Loading Patterns

```tsx
// ✅ Good - Consistent pattern across app
const useLoadingState = (loading: boolean, skeleton: ReactNode, content: ReactNode) => {
  return loading ? skeleton : content;
};
```

### 3. ❌ DON'T: Mix Different Skeleton Styles

```tsx
// ❌ Bad - Inconsistent styles
<Skeleton className="h-4 w-full mb-2" />  // Custom skeleton
<CardSkeleton lines={3} />                 // Template skeleton

// ✅ Good - Use templates consistently
<CardSkeleton lines={4} />
```

### 4. ✅ DO: Add Conditional Props

```tsx
// ✅ Good - Conditional based on actual content
<ProfileSkeleton 
  showStats={userType === 'farmer'}
  showBio={hasDescription}
/>
```

### 5. ✅ DO: Use in Suspense Boundaries

```tsx
// ✅ Good - With React Suspense
<Suspense fallback={<TableSkeleton rows={10} />}>
  <DataTable />
</Suspense>
```

---

## 🔧 Customization

### Extend Existing Templates

```tsx
// Create custom wrapper
const MyCustomCardSkeleton = () => {
  return (
    <div className="my-custom-wrapper">
      <CardSkeleton lines={5} className="shadow-lg" />
    </div>
  );
};
```

### Combine Templates

```tsx
// Combine multiple templates
const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      <NavSkeleton items={5} />
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3">
          <ChartSkeleton />
        </div>
        <div>
          <StatsSkeleton cards={3} className="grid-cols-1" />
        </div>
      </div>
    </div>
  );
};
```

---

## 📊 Performance

### Bundle Impact
- **Total size**: ~2KB (all templates)
- **Tree-shakeable**: Import only what you use
- **No runtime overhead**: Pure React components

### Optimization Tips

```tsx
// ✅ Good - Import only needed templates
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton-templates";

// ❌ Bad - Import all
import * as Skeletons from "@/components/ui/skeleton-templates";
```

---

## 🎨 Visual Consistency

All templates include:
- ✅ **Shimmer effect** - Animated gradient overlay
- ✅ **Pulse animation** - Subtle breathing effect
- ✅ **Rounded corners** - Matches design system
- ✅ **Muted colors** - Uses `bg-muted` from theme
- ✅ **GPU acceleration** - Smooth 60fps animations

---

## 🧪 Testing

### Unit Tests

```tsx
import { render } from '@testing-library/react';
import { CardSkeleton } from '@/components/ui/skeleton-templates';

test('renders card skeleton with correct props', () => {
  const { container } = render(<CardSkeleton lines={5} showFooter />);
  // Assert skeleton structure
});
```

### Visual Regression

```tsx
// Storybook stories
export const Default = () => <CardSkeleton />;
export const WithFooter = () => <CardSkeleton showFooter />;
export const ManyLines = () => <CardSkeleton lines={10} />;
```

---

## 📱 Responsive Behavior

Templates automatically adapt to:
- ✅ Mobile screens (320px+)
- ✅ Tablet screens (768px+)
- ✅ Desktop screens (1024px+)
- ✅ Large displays (1920px+)

```tsx
// Responsive grid example
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {Array.from({ length: 8 }).map((_, i) => (
    <ProductCardSkeleton key={i} />
  ))}
</div>
```

---

## 🌐 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Edge | ✅ Full |
| Mobile Chrome | ✅ Full |
| Mobile Safari | ✅ Full |

---

## 🔍 Troubleshooting

### Issue: Skeleton doesn't match content

**Solution**: Adjust template props to match actual layout

```tsx
// If actual content has 5 lines
<CardSkeleton lines={5} />  // Not lines={3}
```

### Issue: Animation stuttering

**Solution**: Ensure GPU acceleration is enabled

```tsx
// Check CSS has transform properties (already included)
.animate-shimmer {
  animation: shimmer 2s infinite;
  will-change: transform;  // Enables GPU
}
```

### Issue: Skeleton too large/small

**Solution**: Add custom className

```tsx
<CardSkeleton className="max-w-md" />
```

---

## 📖 References

- **Base Component**: `src/components/ui/skeleton.tsx`
- **Templates**: `src/components/ui/skeleton-templates.tsx`
- **Documentation**: `src/components/ui/skeleton-templates.stories.md`
- **Examples**: `src/components/ui/skeleton-examples.tsx`

---

## 🚀 Migration Guide

### Before (Custom Skeletons)

```tsx
// ❌ Old way - Custom skeleton everywhere
<div className="space-y-2">
  <Skeleton className="h-6 w-32" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-10 w-full" />
</div>
```

### After (Templates)

```tsx
// ✅ New way - Use template
<FormSkeleton fields={2} showButton />
```

---

## 💬 Support

Questions? Check:
1. `skeleton-templates.stories.md` - Full API docs
2. `skeleton-examples.tsx` - Real-world examples
3. This README - Best practices

---

**Happy Loading!** 🎉
