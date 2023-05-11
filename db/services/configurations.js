async function getConfigByKey(conn, key, userID) {
    const [result] = await conn.query('SELECT * FROM Configurations WHERE Config_Key = ? and User_ID = ?', [key, userID]);
    return result.length > 0 ? result[0]['Config_Value'] : null;
}

module.exports = {
    getConfigByKey
}