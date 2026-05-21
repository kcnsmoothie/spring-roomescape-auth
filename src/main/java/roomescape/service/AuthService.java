package roomescape.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import roomescape.dao.AuthDao;
import roomescape.domain.User;
import roomescape.dto.request.LoginRequest;
import roomescape.dto.request.SignupRequest;
import roomescape.dto.response.AuthResponse;
import roomescape.util.JwtUtil;
import roomescape.util.PasswordUtil;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthDao authDao;
    private final JwtUtil jwtUtil;
    private final PasswordUtil passwordUtil;

    public AuthResponse signUp(SignupRequest request) {
        if (authDao.existsByEmail(request.email())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        User user = new User(
                null,
                request.email(),
                passwordUtil.encode(request.password()),
                request.name()
        );

        Long savedId = authDao.save(user);
        String token = jwtUtil.createToken(savedId);

        return new AuthResponse(token, request.name());
    }

    public AuthResponse login(LoginRequest request) {
        User user = authDao.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다."));

        if (!passwordUtil.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 틀렸습니다.");
        }

        String token = jwtUtil.createToken(user.getId());
        return new AuthResponse(token, user.getName());
    }
}
