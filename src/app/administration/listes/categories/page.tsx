
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
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [newCategory, setNewCategory] = useState('')

  // Charger les catégories au chargement
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*')
    if (error) {
      console.error('Erreur fetch:', error.message)
    } else {
      setCategories(data || [])
    }
  }

  const handleAdd = async () => {
    if (!newCategory.trim()) return
    const { error } = await supabase.from('categories').insert({ nom: newCategory })
    if (error) {
      console.error('Erreur ajout:', error.message)
    } else {
      setNewCategory('')
      fetchCategories()
    }
  }

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      console.error('Erreur suppression:', error.message)
    } else {
      fetchCategories()
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Catégories</h1>

      <div className="flex mb-4 gap-2">
        <input
          className="border p-2 rounded w-full"
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nouvelle catégorie"
        />
        <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded">
          Ajouter
        </button>
      </div>

      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex justify-between items-center border-b pb-1">
            {cat.nom}
            <button onClick={() => handleDelete(cat.id)} className="text-red-500 text-sm">
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

