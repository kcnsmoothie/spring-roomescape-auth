package roomescape.dao;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import roomescape.domain.User;

import java.util.HashMap;
import java.util.Map;

@Repository
@Transactional(readOnly = true)
public class AuthDao {

    private final JdbcTemplate jdbcTemplate;
    private final SimpleJdbcInsert jdbcInsert;

    public AuthDao(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.jdbcInsert = new SimpleJdbcInsert(jdbcTemplate)
                .withTableName("users")
                .usingGeneratedKeyColumns("id");
    }

    public boolean existsByEmail(String email) {
        Boolean result = jdbcTemplate.queryForObject("""
        SELECT EXISTS(
            SELECT *
            FROM user
            WHERE email = ?
        )
        """,
                Boolean.class,
                email
        );
        return Boolean.TRUE.equals(result);
    }

    @Transactional
    public User save(User user) {
        Map<String, Object> params = new HashMap<>();
        params.put("email", user.getEmail());
        params.put("password", user.getPassword());
        params.put("nickname", user.getName());
        Long id = jdbcInsert.executeAndReturnKey(params).longValue();

        return new User(id, user.getEmail(), user.getPassword(), user.getName());
    }

    @Transactional
    public void delete(Long id) {
        jdbcTemplate.update("DELETE FROM user WHERE id = ?", id);
    }
}
