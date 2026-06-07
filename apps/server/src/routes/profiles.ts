import { Router } from 'express';
import multer from 'multer';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from '@cricket/shared';
import { supabase } from '../supabase';
import { IMAGE_MIME_EXT } from '../uploads';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const profileRoutes = Router();

// Get the current user's profile
profileRoutes.get('/profiles/me', requireAuth, async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    res.json({ ...data, email: user.email });
  } catch (err) {
    next(err);
  }
});

// Update the current user's profile (name, phone, paypal_email, avatar)
profileRoutes.put('/profiles/me', requireAuth, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;

    const patch: Record<string, any> = { ...req.body };
    // Normalize empty strings to null for optional contact fields.
    for (const key of ['paypal_email', 'phone'] as const) {
      if (typeof patch[key] === 'string' && patch[key].trim() === '') patch[key] = null;
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Upload the current user's avatar
profileRoutes.post('/profiles/me/avatar', requireAuth, upload.single('avatar'), async (req, res, next) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    // Accept only real image types; name the object from the verified MIME, not
    // the client filename (avoids storing e.g. an SVG/HTML payload in a public
    // bucket).
    const ext = IMAGE_MIME_EXT[file.mimetype];
    if (!ext) {
      res.status(400).json({ error: 'Unsupported image type' });
      return;
    }
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});
