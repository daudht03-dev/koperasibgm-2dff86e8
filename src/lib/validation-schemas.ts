import { z } from "zod";

// Farmer validation schema
export const farmerSchema = z.object({
  nama: z.string()
    .trim()
    .min(1, "Nama petani harus diisi")
    .max(100, "Nama petani maksimal 100 karakter"),
  kode_petani: z.string()
    .trim()
    .min(1, "Kode petani harus diisi")
    .max(20, "Kode petani maksimal 20 karakter")
    .regex(/^[A-Z0-9-]+$/, "Kode petani hanya boleh berisi huruf besar, angka, dan tanda strip"),
  alamat: z.string()
    .trim()
    .min(1, "Alamat harus diisi")
    .max(500, "Alamat maksimal 500 karakter"),
});

// Land validation schema
export const landSchema = z.object({
  kode_lahan: z.string()
    .trim()
    .min(1, "Kode lahan harus diisi")
    .max(50, "Kode lahan maksimal 50 karakter"),
  keterangan: z.string()
    .trim()
    .max(500, "Keterangan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  petani_id: z.string().optional().or(z.literal("")),
});

// Harvest validation schema
export const harvestSchema = z.object({
  lahan_id: z.string()
    .min(1, "Lahan harus dipilih"),
  tanggal_panen: z.string()
    .min(1, "Tanggal panen harus diisi")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, "Tanggal panen tidak boleh di masa depan"),
  jumlah_kg: z.string()
    .trim()
    .min(1, "Jumlah hasil panen harus diisi")
    .refine((val) => !isNaN(parseFloat(val)), "Jumlah hasil panen harus berupa angka")
    .refine((val) => parseFloat(val) > 0, "Jumlah hasil panen harus lebih dari 0")
    .refine((val) => parseFloat(val) <= 100000, "Jumlah hasil panen maksimal 100,000 kg"),
  keterangan: z.string()
    .trim()
    .max(500, "Keterangan maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

// Product validation schema
export const productSchema = z.object({
  nama: z.string()
    .trim()
    .min(1, "Nama produk harus diisi")
    .max(100, "Nama produk maksimal 100 karakter"),
  deskripsi: z.string()
    .trim()
    .max(1000, "Deskripsi maksimal 1000 karakter")
    .optional()
    .or(z.literal("")),
  harga: z.string()
    .trim()
    .min(1, "Harga harus diisi")
    .refine((val) => !isNaN(parseFloat(val)), "Harga harus berupa angka")
    .refine((val) => parseFloat(val) > 0, "Harga harus lebih dari 0")
    .refine((val) => parseFloat(val) <= 1000000000, "Harga maksimal 1 miliar"),
  gambar_url: z.string().optional(),
});

// Company profile validation schema
export const companyProfileSchema = z.object({
  nama_perusahaan: z.string()
    .trim()
    .min(1, "Nama perusahaan harus diisi")
    .max(100, "Nama perusahaan maksimal 100 karakter"),
  deskripsi: z.string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter")
    .optional()
    .or(z.literal("")),
  alamat: z.string()
    .trim()
    .max(500, "Alamat maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  kontak: z.string()
    .trim()
    .max(100, "Kontak maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  logo_url: z.string().optional(),
});

// Image file validation
export const imageFileSchema = z.instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, "Ukuran file maksimal 5MB")
  .refine(
    (file) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type),
    "File harus berformat JPG, PNG, atau WebP"
  );

// Authentication validation schema
export const authSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email harus diisi")
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter"),
  password: z.string()
    .min(8, "Password minimal 8 karakter")
    .max(128, "Password maksimal 128 karakter"),
  fullName: z.string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .optional(),
});

export type FarmerFormData = z.infer<typeof farmerSchema>;
export type LandFormData = z.infer<typeof landSchema>;
export type HarvestFormData = z.infer<typeof harvestSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;
export type AuthFormData = z.infer<typeof authSchema>;
