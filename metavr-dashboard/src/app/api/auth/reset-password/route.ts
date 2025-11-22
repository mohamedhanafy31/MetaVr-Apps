import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/lib/validations/schemas';
import { db } from '@/lib/firebase/admin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Query user from Firestore
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('email', '==', validatedData.email).get();

    if (querySnapshot.empty) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If the email exists, password reset instructions have been sent',
      });
    }

    const userDoc = querySnapshot.docs[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store reset token in user document
    await userDoc.ref.update({
      resetToken,
      resetTokenExpiry,
    });

    // TODO: Send email with reset link
    // For now, we'll just return success
    // In production, you would send an email with the reset token

    return NextResponse.json({
      success: true,
      message: 'Password reset instructions have been sent to your email',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
