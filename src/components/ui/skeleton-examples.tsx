/**
 * Skeleton Templates Usage Examples
 * 
 * File ini berisi contoh-contoh penggunaan skeleton templates
 * untuk berbagai use cases di aplikasi.
 */

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
  CommentSkeleton,
} from "@/components/ui/skeleton-templates";

/**
 * Example 1: Admin Dashboard Loading State
 */
export const DashboardLoadingSkeleton = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Stats Cards */}
      <StatsSkeleton cards={4} showTrend />
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="pie" />
      </div>
      
      {/* Data Table */}
      <div className="space-y-4">
        <TableSkeleton rows={8} columns={5} />
      </div>
    </div>
  );
};

/**
 * Example 2: Farmer List Loading State
 */
export const FarmerListLoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Daftar Petani</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} showFooter lines={4} />
        ))}
      </div>
    </div>
  );
};

/**
 * Example 3: Product Grid Loading State
 */
export const ProductGridLoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} showRating showPrice />
      ))}
    </div>
  );
};

/**
 * Example 4: Profile Page Loading State
 */
export const ProfilePageLoadingSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Profile Header */}
      <ProfileSkeleton showStats bioLines={4} />
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton showHeader lines={5} />
        <CardSkeleton showHeader lines={4} showFooter />
      </div>
      
      {/* Activity List */}
      <div className="space-y-4">
        <ListSkeleton items={5} showAvatar />
      </div>
    </div>
  );
};

/**
 * Example 5: Form Loading State
 */
export const FormLoadingSkeleton = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <FormSkeleton fields={6} showTitle />
    </div>
  );
};

/**
 * Example 6: Navigation Loading State
 */
export const NavLoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <NavSkeleton items={5} orientation="horizontal" className="border-b pb-4" />
      <div className="flex gap-6">
        <NavSkeleton items={8} orientation="vertical" className="w-64" />
        <div className="flex-1">
          <CardSkeleton lines={10} />
        </div>
      </div>
    </div>
  );
};

/**
 * Example 7: Comment Thread Loading State
 */
export const CommentThreadLoadingSkeleton = () => {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <CommentSkeleton items={5} showReplies />
    </div>
  );
};

/**
 * Example 8: Sidebar with Stats Loading State
 */
export const SidebarStatsLoadingSkeleton = () => {
  return (
    <div className="w-80 space-y-4">
      <ProfileSkeleton showBio={false} />
      <StatsSkeleton cards={3} showIcon={false} className="grid-cols-1" />
      <CardSkeleton lines={5} showFooter />
    </div>
  );
};

/**
 * Example 9: Gallery Loading State
 */
export const GalleryLoadingSkeleton = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <ImageSkeleton key={i} aspectRatio="square" className="rounded-lg" />
      ))}
    </div>
  );
};

/**
 * Example 10: Mixed Layout Loading State
 */
export const MixedLayoutLoadingSkeleton = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImageSkeleton aspectRatio="video" />
        <ProfileSkeleton showStats bioLines={5} />
      </div>
      
      {/* Stats */}
      <StatsSkeleton cards={4} />
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartSkeleton type="bar" />
          <TableSkeleton rows={6} columns={4} />
        </div>
        <div className="space-y-4">
          <CardSkeleton lines={4} />
          <ListSkeleton items={5} showIcon />
        </div>
      </div>
    </div>
  );
};

/**
 * Example 11: Mobile-Optimized List Loading
 */
export const MobileListLoadingSkeleton = () => {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg">
          <ListSkeleton items={1} showAvatar showIcon />
        </div>
      ))}
    </div>
  );
};

/**
 * Example 12: Search Results Loading State
 */
export const SearchResultsLoadingSkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <FormSkeleton fields={1} showButton={false} showTitle={false} className="flex-1" />
      </div>
      
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} showHeader={false} lines={3} />
        ))}
      </div>
    </div>
  );
};
