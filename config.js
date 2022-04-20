module.exports = {
  port: 3000,
  mongoConnectionString: 'mongodb://20.224.137.80:27017/test_mtaa',
  jwtAliveTime: '4h',
  game: {
    roles: {
      'CIVILIAN': 'CIV',
      'MAFIA': 'MAF',
      'DOCTOR': 'DOC',
      'SHERIFF': 'SRF'
    }
  }
}