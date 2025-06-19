import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureProps) {
  return (
    <Card className="flex h-full transform flex-col shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <CardHeader className="flex flex-row items-center space-x-4 pb-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/80">{description}</p>
      </CardContent>
    </Card>
  );
}
