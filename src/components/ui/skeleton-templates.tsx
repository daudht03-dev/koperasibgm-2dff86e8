import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Card Skeleton - For card components with header and content
 */
interface CardSkeletonProps {
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
  className?: string;
}

export const CardSkeleton = ({ 
  showHeader = true, 
  showFooter = false, 
  lines = 3,
  className = ""
}: CardSkeletonProps) => {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-4" 
            style={{ width: `${Math.random() * 30 + 70}%` }}
          />
        ))}
      </CardContent>
      {showFooter && (
        <div className="px-6 pb-6">
          <Skeleton className="h-10 w-full" />
        </div>
      )}
    </Card>
  );
};

/**
 * Table Skeleton - For data tables and lists
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export const TableSkeleton = ({ 
  rows = 5, 
  columns = 4,
  showHeader = true,
  className = ""
}: TableSkeletonProps) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {showHeader && (
        <div className="flex gap-4 pb-2 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-5 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className="h-8 flex-1" 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Form Skeleton - For form inputs
 */
interface FormSkeletonProps {
  fields?: number;
  showButton?: boolean;
  showTitle?: boolean;
  className?: string;
}

export const FormSkeleton = ({ 
  fields = 3, 
  showButton = true,
  showTitle = true,
  className = ""
}: FormSkeletonProps) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && <Skeleton className="h-8 w-1/3 mb-6" />}
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showButton && (
        <Skeleton className="h-10 w-full mt-6" />
      )}
    </div>
  );
};

/**
 * Profile Skeleton - For user/company profiles
 */
interface ProfileSkeletonProps {
  showAvatar?: boolean;
  showBio?: boolean;
  bioLines?: number;
  showStats?: boolean;
  className?: string;
}

export const ProfileSkeleton = ({ 
  showAvatar = true,
  showBio = true,
  bioLines = 3,
  showStats = false,
  className = ""
}: ProfileSkeletonProps) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        {showAvatar && <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      {showBio && (
        <div className="space-y-2">
          {Array.from({ length: bioLines }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-4" 
              style={{ width: i === bioLines - 1 ? '60%' : '100%' }}
            />
          ))}
        </div>
      )}

      {showStats && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 text-center">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Stats Card Skeleton - For statistics/metrics cards
 */
interface StatsSkeletonProps {
  cards?: number;
  showIcon?: boolean;
  showTrend?: boolean;
  className?: string;
}

export const StatsSkeleton = ({ 
  cards = 4,
  showIcon = true,
  showTrend = true,
  className = ""
}: StatsSkeletonProps) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
              {showIcon && <Skeleton className="h-10 w-10 rounded-lg" />}
            </div>
            {showTrend && (
              <div className="mt-3">
                <Skeleton className="h-3 w-32" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/**
 * Image Skeleton - For image placeholders
 */
interface ImageSkeletonProps {
  aspectRatio?: "square" | "video" | "portrait" | "wide";
  className?: string;
}

export const ImageSkeleton = ({ 
  aspectRatio = "square",
  className = ""
}: ImageSkeletonProps) => {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
    wide: "aspect-[21/9]"
  };

  return (
    <Skeleton className={`w-full ${aspectClasses[aspectRatio]} ${className}`} />
  );
};

/**
 * List Skeleton - For simple list items
 */
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const ListSkeleton = ({ 
  items = 5,
  showAvatar = false,
  showIcon = false,
  className = ""
}: ListSkeletonProps) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          {showIcon && <Skeleton className="h-8 w-8 rounded flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
};

/**
 * Navigation Skeleton - For nav menus
 */
interface NavSkeletonProps {
  items?: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export const NavSkeleton = ({ 
  items = 5,
  orientation = "horizontal",
  className = ""
}: NavSkeletonProps) => {
  const containerClass = orientation === "horizontal" 
    ? "flex gap-6" 
    : "space-y-2";

  return (
    <div className={`${containerClass} ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={orientation === "horizontal" ? "h-8 w-20" : "h-10 w-full"}
        />
      ))}
    </div>
  );
};

/**
 * Chart Skeleton - For chart/graph placeholders
 */
interface ChartSkeletonProps {
  type?: "bar" | "line" | "pie";
  showLegend?: boolean;
  className?: string;
}

export const ChartSkeleton = ({ 
  type = "bar",
  showLegend = true,
  className = ""
}: ChartSkeletonProps) => {
  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        {type === "pie" ? (
          <div className="flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
        {showLegend && (
          <div className="flex gap-4 mt-4 justify-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Product Card Skeleton - For e-commerce product cards
 */
interface ProductCardSkeletonProps {
  showPrice?: boolean;
  showRating?: boolean;
  className?: string;
}

export const ProductCardSkeleton = ({ 
  showPrice = true,
  showRating = false,
  className = ""
}: ProductCardSkeletonProps) => {
  return (
    <Card className={className}>
      <ImageSkeleton aspectRatio="square" className="rounded-t-lg" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-2/3" />
        {showPrice && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        )}
        {showRating && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        )}
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
};

/**
 * Comment Skeleton - For comment threads
 */
interface CommentSkeletonProps {
  items?: number;
  showReplies?: boolean;
  className?: string;
}

export const CommentSkeleton = ({ 
  items = 3,
  showReplies = false,
  className = ""
}: CommentSkeletonProps) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 mt-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
          {showReplies && (
            <div className="ml-12 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
