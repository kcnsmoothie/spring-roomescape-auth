package roomescape.dao;

import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
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

    public Optional<User> findByEmail(String email) {
        try {
            User user = jdbcTemplate.queryForObject(
                    "SELECT id, email, password, name FROM users WHERE email = ?",
                    (rs, rowNum) -> new User(      // ← 람다 직접 작성
                            rs.getLong("id"),
                            rs.getString("email"),
                            rs.getString("password"),
                            rs.getString("name")
                    ),
                    email
            );
            return Optional.ofNullable(user);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<User> findById(Long id) {
        try {
            User user = jdbcTemplate.queryForObject(
                    "SELECT id, email, password, name FROM users WHERE id = ?",
                    (rs, rowNum) -> new User(
                            rs.getLong("id"),
                            rs.getString("email"),
                            rs.getString("password"),
                            rs.getString("name")
                    ),
                    id
            );
            return Optional.ofNullable(user);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public boolean existsByEmail(String email) {
        Boolean result = jdbcTemplate.queryForObject("""
        SELECT EXISTS(
            SELECT *
            FROM users
            WHERE email = ?
        )
        """,
                Boolean.class,
                email
        );
        return Boolean.TRUE.equals(result);
    }

    @Transactional
    public Long save(User user) {
        Map<String, Object> params = new HashMap<>();
        params.put("email", user.getEmail());
        params.put("password", user.getPassword());
        params.put("name", user.getName());
        return jdbcInsert.executeAndReturnKey(params).longValue();
    }

    @Transactional
    public void delete(Long id) {
        jdbcTemplate.update("DELETE FROM users WHERE id = ?", id);
    }
}
