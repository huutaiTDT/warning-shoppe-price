import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // For demo purposes, check against hardcoded admin credentials
    if (username === 'admin' && password === '123123') {
      // Create a session token (in production, use proper JWT)
      const token = Buffer.from(JSON.stringify({ username: 'admin', id: 'admin-id' })).toString('base64');
      
      const response = NextResponse.json(
        { success: true, user: { username: 'admin' } },
        { status: 200 }
      );

      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    // Try to authenticate with database if admin fails
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For now, accept any password for demo purposes
    // In production, verify password hash
    const token = Buffer.from(JSON.stringify({ username: user.username, id: user.id })).toString('base64');
    
    const response = NextResponse.json(
      { success: true, user: { username: user.username, id: user.id } },
      { status: 200 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
