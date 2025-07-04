'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        console.error('Erreur Supabase:', error);
      } else {
        setCategories(data);
      }
    }

    fetchCategories();
  }, []);

  return (
    <div>
      <h1>Liste des Catégories</h1>
      <ul>
        {categories.map((cat: any) => (
          <li key={cat.id}>{cat.nom}</li>
        ))}
      </ul>
    </div>
  );
}

import { getCategories } from "@/lib/actions";
import { CategoriesView } from "./view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
    const categories = await getCategories();

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/administration/listes">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour
                    </Link>
                </Button>
            </div>
            <CategoriesView categories={categories} />
        </div>
    );
}
