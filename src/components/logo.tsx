import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="https://cdn-transverse.azureedge.net/phlogos/BC548191.jpg"
        alt="Trapel Football Club Logo"
        width={40}
        height={40}
        className="rounded-full"
      />
      <h1 className="text-lg font-bold font-headline text-foreground">Trapel Football Club</h1>
    </div>
  );
}
