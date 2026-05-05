'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';

export default function UploadPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    brand: '',
    image: null as File | null
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, image: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Kérlek először jelentkezz be!');
      }

      let imageUrl = null;

      // Upload image if selected
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, formData.image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Insert product into database with user_id
      const { error } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price),
          category: formData.category,
          condition: formData.condition,
          brand: formData.brand,
          image_url: imageUrl,
          user_id: user.id
        });

      if (error) throw error;

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        condition: '',
        brand: '',
        image: null
      });

      toast.success('✅ Termék sikeresen feltöltve!');

    } catch (error) {
      console.error('Error uploading product:', error);
      toast.error('❌ Hiba történt a feltöltés során! Kérlek próbáld újra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white">

      <main className="min-h-screen pt-28 pb-16 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-center">Termékfeltöltés</h1>
          <p className="text-white/60 text-center mb-10">Add hozzá új terméked a közösséghez</p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
            {/* Product Name */}
            <div>
              <label className="block mb-2 font-medium text-white/90">Termék neve</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="pl. Nike Air Max 270"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block mb-2 font-medium text-white/90">Leírás</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"
                placeholder="Írd le a termék állapotát, méretét és egyéb jellemzőit..."
              />
            </div>

            {/* Price and Category row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-white/90">Ár (Ft)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-white/90">Kategória</label>
                <CustomSelect
                  options={[
                    { value: 'clothing', label: 'Ruházat' },
                    { value: 'shoes', label: 'Cipő' },
                    { value: 'accessories', label: 'Kiegészítők' },
                    { value: 'electronics', label: 'Elektronika' },
                    { value: 'other', label: 'Egyéb' },
                  ]}
                  value={formData.category}
                  onChange={(val) => handleInputChange({ target: { name: 'category', value: val } } as any)}
                  placeholder="Válassz kategóriát"
                />
              </div>
            </div>

            {/* Brand and Condition row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-white/90">Márka</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  placeholder="pl. Nike, Adidas, Apple"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-white/90">Állapot</label>
                <CustomSelect
                  options={[
                    { value: 'new', label: 'Új' },
                    { value: 'excellent', label: 'Kiváló' },
                    { value: 'good', label: 'Jó' },
                    { value: 'fair', label: 'Közepes' },
                    { value: 'poor', label: 'Rossz' },
                  ]}
                  value={formData.condition}
                  onChange={(val) => handleInputChange({ target: { name: 'condition', value: val } } as any)}
                  placeholder="Válassz állapotot"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block mb-2 font-medium text-white/90">Termék képe</label>
              <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:border-accent transition-colors cursor-pointer group">
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="text-4xl mb-3 group-hover:text-accent transition-colors">📷</div>
                  <p className="text-white/70">
                    {formData.image ? formData.image.name : 'Kattints a kép kiválasztásához vagy húzd ide'}
                  </p>
                  <p className="text-white/40 text-sm mt-1">PNG, JPG, WEBP támogatva</p>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-accent/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Feltöltés folyamatban...' : 'Termék feltöltése'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}