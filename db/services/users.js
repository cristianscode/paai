// Find or create user based on the sender's phone number
async function findOrCreateUserByPhoneNumber(conn, phoneNumber) {
    const [result] = await conn.query('SELECT * FROM Users WHERE Phone_Number = ?', [phoneNumber]);
    if (result.length > 0) {
        return result[0];
    } else {
        await conn.query('INSERT INTO Users (phone_number) VALUES (?)', [phoneNumber]);
        const [newUser] = await conn.query('SELECT * FROM Users WHERE phone_number = ?', [phoneNumber]);
        return newUser[0];
    }
}

module.exports = UserService = {
    findOrCreateUserByPhoneNumber
}