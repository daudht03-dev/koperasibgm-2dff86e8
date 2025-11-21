# Skeleton Templates Documentation

Reusable skeleton loader templates untuk loading states di seluruh aplikasi.

## Import

```tsx
import { 
  CardSkeleton,
  TableSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  StatsSkeleton,
  ImageSkeleton,
  ListSkeleton,
  NavSkeleton,
  ChartSkeleton,
  ProductCardSkeleton,
  CommentSkeleton
} from "@/components/ui/skeleton-templates";
```

---

## 1. CardSkeleton

Untuk card components dengan header dan content.

### Props
- `showHeader?: boolean` (default: `true`) - Show card header
- `showFooter?: boolean` (default: `false`) - Show card footer
- `lines?: number` (default: `3`) - Number of content lines
- `className?: string` - Additional CSS classes

### Usage
```tsx
<CardSkeleton />
<CardSkeleton showFooter lines={5} />
<CardSkeleton showHeader={false} lines={2} />
```

---

## 2. TableSkeleton

Untuk data tables dan lists.

### Props
- `rows?: number` (default: `5`) - Number of rows
- `columns?: number` (default: `4`) - Number of columns
- `showHeader?: boolean` (default: `true`) - Show table header
- `className?: string` - Additional CSS classes

### Usage
```tsx
<TableSkeleton />
<TableSkeleton rows={10} columns={6} />
<TableSkeleton showHeader={false} rows={3} />
```

---

## 3. FormSkeleton

Untuk form inputs.

### Props
- `fields?: number` (default: `3`) - Number of form fields
- `showButton?: boolean` (default: `true`) - Show submit button
- `showTitle?: boolean` (default: `true`) - Show form title
- `className?: string` - Additional CSS classes

### Usage
```tsx
<FormSkeleton />
<FormSkeleton fields={5} />
<FormSkeleton showTitle={false} showButton={false} />
```

---

## 4. ProfileSkeleton

Untuk user/company profiles.

### Props
- `showAvatar?: boolean` (default: `true`) - Show avatar
- `showBio?: boolean` (default: `true`) - Show bio section
- `bioLines?: number` (default: `3`) - Number of bio lines
- `showStats?: boolean` (default: `false`) - Show stats section
- `className?: string` - Additional CSS classes

### Usage
```tsx
<ProfileSkeleton />
<ProfileSkeleton showStats bioLines={5} />
<ProfileSkeleton showAvatar={false} />
```

---

## 5. StatsSkeleton

Untuk statistics/metrics cards.

### Props
- `cards?: number` (default: `4`) - Number of stat cards
- `showIcon?: boolean` (default: `true`) - Show icon placeholder
- `showTrend?: boolean` (default: `true`) - Show trend indicator
- `className?: string` - Additional CSS classes

### Usage
```tsx
<StatsSkeleton />
<StatsSkeleton cards={3} />
<StatsSkeleton showIcon={false} showTrend={false} />
```

---

## 6. ImageSkeleton

Untuk image placeholders.

### Props
- `aspectRatio?: "square" | "video" | "portrait" | "wide"` (default: `"square"`)
- `className?: string` - Additional CSS classes

### Usage
```tsx
<ImageSkeleton />
<ImageSkeleton aspectRatio="video" />
<ImageSkeleton aspectRatio="portrait" className="rounded-lg" />
```

---

## 7. ListSkeleton

Untuk simple list items.

### Props
- `items?: number` (default: `5`) - Number of list items
- `showAvatar?: boolean` (default: `false`) - Show avatar
- `showIcon?: boolean` (default: `false`) - Show icon
- `className?: string` - Additional CSS classes

### Usage
```tsx
<ListSkeleton />
<ListSkeleton items={10} showAvatar />
<ListSkeleton showIcon items={3} />
```

---

## 8. NavSkeleton

Untuk navigation menus.

### Props
- `items?: number` (default: `5`) - Number of nav items
- `orientation?: "horizontal" | "vertical"` (default: `"horizontal"`)
- `className?: string` - Additional CSS classes

### Usage
```tsx
<NavSkeleton />
<NavSkeleton orientation="vertical" items={8} />
<NavSkeleton items={3} />
```

---

## 9. ChartSkeleton

Untuk chart/graph placeholders.

### Props
- `type?: "bar" | "line" | "pie"` (default: `"bar"`)
- `showLegend?: boolean` (default: `true`) - Show legend
- `className?: string` - Additional CSS classes

### Usage
```tsx
<ChartSkeleton />
<ChartSkeleton type="pie" />
<ChartSkeleton type="line" showLegend={false} />
```

---

## 10. ProductCardSkeleton

Untuk e-commerce product cards.

### Props
- `showPrice?: boolean` (default: `true`) - Show price section
- `showRating?: boolean` (default: `false`) - Show rating
- `className?: string` - Additional CSS classes

### Usage
```tsx
<ProductCardSkeleton />
<ProductCardSkeleton showRating />
<ProductCardSkeleton showPrice={false} />
```

---

## 11. CommentSkeleton

Untuk comment threads.

### Props
- `items?: number` (default: `3`) - Number of comments
- `showReplies?: boolean` (default: `false`) - Show reply threads
- `className?: string` - Additional CSS classes

### Usage
```tsx
<CommentSkeleton />
<CommentSkeleton items={5} showReplies />
<CommentSkeleton items={2} />
```

---

## Real-World Examples

### Loading Dashboard
```tsx
const Dashboard = () => {
  const { data, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton cards={4} />
        <div className="grid grid-cols-2 gap-6">
          <ChartSkeleton type="bar" />
          <ChartSkeleton type="pie" />
        </div>
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return <DashboardContent data={data} />;
};
```

### Loading Product List
```tsx
const ProductList = () => {
  const { products, loading } = useProducts();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} showRating />
        ))}
      </div>
    );
  }

  return <ProductGrid products={products} />;
};
```

### Loading Profile Page
```tsx
const ProfilePage = () => {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div className="space-y-6">
        <ProfileSkeleton showStats bioLines={4} />
        <div className="grid grid-cols-2 gap-6">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} showFooter />
        </div>
      </div>
    );
  }

  return <ProfileContent profile={profile} />;
};
```

---

## Best Practices

1. **Match Layout**: Skeleton dimensions should match final content
2. **Consistent Timing**: Use same loading duration across app
3. **Conditional Rendering**: Only show when actually loading
4. **Responsive Design**: Templates work on all screen sizes
5. **Accessibility**: Semantic HTML preserved

---

## Performance

- ✅ CSS-only animations (GPU accelerated)
- ✅ Tree-shakable (import only what you need)
- ✅ Minimal bundle impact (~2KB total)
- ✅ No runtime overhead
- ✅ Works offline

---

## Browser Support

All modern browsers supported:
- Chrome/Edge ✅
- Firefox ✅
- Safari ✅
- Mobile browsers ✅
