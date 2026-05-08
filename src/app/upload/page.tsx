'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

export default function UploadPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    brand: '',
  });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    const maxImages = 6;
    const remaining = maxImages - images.length;
    
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} kép tölthető fel!`);
      return;
    }

    const filesToAdd = newFiles.slice(0, remaining);
    
    filesToAdd.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`A "${file.name}" nem kép fájl!`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          file,
          preview: e.target?.result as string,
          id: Math.random().toString(36).substring(2)
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (newFiles.length > remaining) {
      toast.info(`Csak ${remaining} további kép tölthető fel.`);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setImages(newImages);
  };

  const uploadImages = async (userId: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const image of images) {
      const fileExt = image.file.name.split('.').pop();
      const fileName = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, image.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      urls.push(publicUrl);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Kérlek először jelentkezz be!');
      }

      let imageUrls: string[] = [];

      // Upload all images
      if (images.length > 0) {
        imageUrls = await uploadImages(user.id);
      }

      // Insert product with image_url as first image, images as JSON array
      const { error } = await supabase
        .from('products')
        .insert({
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price),
          category: formData.category,
          condition: formData.condition,
          brand: formData.brand,
          image_url: imageUrls[0] || null,
          images: imageUrls, // Store all images as JSON array
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
      });
      setImages([]);

      toast.success('✅ Termék sikeresen feltöltve!');

    } catch (error: any) {
      console.error('Error uploading product:', error);
      toast.error('❌ Hiba történt a feltöltés során! ' + (error.message || 'Kérlek próbáld újra.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="min-h-screen pt-16 pb-10 flex flex-col items-center px-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Termékfeltöltés</h1>
          <p className="text-gray-500 text-center mb-6">Add hozzá új terméked a közösséghez</p>

          <form onSubmit={handleSubmit} className="space-y-5 bg-white p-5 md:p-7 rounded-2xl border border-gray-200 shadow-sm">
            {/* Product Name */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">Termék neve</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input-base focus:outline-none focus:ring-1 focus:ring-[#007782]"
                placeholder="pl. Nike Air Max 270"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">Leírás</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="textarea-base focus:outline-none focus:ring-1 focus:ring-[#007782] resize-none"
                placeholder="Írd le a termék állapotát, méretét és egyéb jellemzőit..."
              />
            </div>

            {/* Price and Category row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700">Ár (Ft)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="input-base focus:outline-none focus:ring-1 focus:ring-[#007782]"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">Kategória</label>
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
                <label className="block mb-2 font-medium text-gray-700">Márka</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="input-base focus:outline-none focus:ring-1 focus:ring-[#007782]"
                  placeholder="pl. Nike, Adidas, Apple"
                />
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">Állapot</label>
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

            {/* Multi Image Upload - Vinted style */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">
                Képek
                <span className="text-gray-400 text-sm ml-2">({images.length}/6)</span>
              </label>
              
              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {images.map((image, index) => (
                    <div 
                      key={image.id} 
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group"
                    >
                      <img 
                        src={image.preview} 
                        alt={`Kép ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveImage(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 rounded-full bg-white/30 hover:bg-white/40 disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, 'down')}
                          disabled={index === images.length - 1}
                          className="p-1.5 rounded-full bg-white/30 hover:bg-white/40 disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100 text-white"
                      >
                        <X size={14} />
                      </button>

                      {/* Order badge */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 text-[10px] text-white">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {images.length < 6 && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#007782] transition-colors cursor-pointer group bg-gray-50"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                    className="hidden"
                  />
                  <div className="text-4xl mb-3 group-hover:text-accent transition-colors">
                    <Plus size={40} className="mx-auto text-gray-400 group-hover:text-[#007782]" />
                  </div>
                  <p className="text-gray-700">Kattints a képek kiválasztásához</p>
                  <p className="text-gray-500 text-sm mt-1">
                    {images.length === 0 
                      ? 'Első kép a termék fő képe lesz (PNG, JPG, WEBP)'
                      : 'Válassz további képeket'}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || images.length === 0}
              className="w-full btn-base btn-primary mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Feltöltés folyamatban...
                </span>
              ) : (
                'Termék feltöltése'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}