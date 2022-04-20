module.exports = {
  port: 3000,
  mongoConnectionString: 'mongodb://2asd',
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