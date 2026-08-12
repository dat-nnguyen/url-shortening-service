export async function registerUser(email, password) {
    try {
        const existingUser = await prisma.user.findUnique({ where : { email } })
    
        if (existingUser) {
            throw new Error ('Email is already existed.');
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        return true;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
}

export async function loginUser(email, password) {
    try {
        const user = await prisma.user.findUnique({ where : { email } });

        if (!user) {
            throw new Error ('Invalid email or password');
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            throw new Error ('Invalid email or password');
        }

        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return token;
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
}
