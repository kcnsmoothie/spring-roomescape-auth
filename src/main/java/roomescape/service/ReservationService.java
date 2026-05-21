package roomescape.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import roomescape.dao.ReservationDao;
import roomescape.dao.ReservationTimeDao;
import roomescape.dao.ThemeDao;
import roomescape.domain.Reservation;
import roomescape.domain.ReservationTime;
import roomescape.domain.Theme;
import roomescape.domain.User;
import roomescape.dto.request.ReservationRequest;
import roomescape.dto.request.UserReservationUpdateRequest;
import roomescape.dto.response.ReservationResponse;
import roomescape.exception.AuthenticationException;
import roomescape.exception.IdNotFoundException;
import roomescape.exception.NameNotFoundException;

@Service
public class ReservationService {

    private final ReservationDao reservationDao;
    private final ReservationTimeDao reservationTimeDao;
    private final ThemeDao themeDao;

    public ReservationService(ReservationDao reservationDao, ReservationTimeDao reservationTimeDao, ThemeDao themeDao) {
        this.reservationDao = reservationDao;
        this.reservationTimeDao = reservationTimeDao;
        this.themeDao = themeDao;
    }

    public ReservationResponse find(String name) {
        Reservation response = reservationDao.findByName(name)
                .orElseThrow(() -> new NameNotFoundException("해당 이름의 예약이 존재하지 않습니다."));
        return ReservationResponse.from(response);
    }

    public List<ReservationResponse> findAll() {
        return reservationDao.findAll()
                .stream()
                .map(ReservationResponse::from)
                .collect(Collectors.toList());
    }

    public List<ReservationResponse> findAllByUser(User user) {
        return reservationDao.findAllByName(user.getName())
                .stream()
                .map(ReservationResponse::from)
                .collect(Collectors.toList());
    }

    public ReservationResponse save(ReservationRequest request, User user) {
        ReservationTime time = findReservationTime(request.timeId());
        Theme theme = findTheme(request.themeId());
        validateReservable(request, time, theme);

        Reservation reservation = new Reservation(
                user.getName(),
                request.date(),
                time,
                theme
        );

        Reservation saved = reservationDao.save(reservation);
        return ReservationResponse.from(saved);
    }

    public ReservationResponse update(Long id, UserReservationUpdateRequest request, User user) {
        Reservation reservation = reservationDao.findById(id);
        validateOwner(reservation, user);

        ReservationTime time = findReservationTime(request.timeId());
        Theme theme = findTheme(request.themeId());
        validateReservable(request, time, theme);

        Reservation updated = reservationDao.update(id, request.date(), request.timeId());
        return ReservationResponse.from(updated);
    }

    public void delete(Long id, User user) {
        Reservation reservation = reservationDao.findById(id);
        validateOwner(reservation, user);
        reservationDao.delete(id);
    }

    public ReservationResponse save(ReservationRequest request) {
        ReservationTime time = findReservationTime(request.timeId());
        Theme theme = findTheme(request.themeId());
        validateReservable(request, time, theme);

        Reservation reservation = new Reservation(
                request.name(),
                request.date(),
                time,
                theme
        );
        Reservation saved = reservationDao.save(reservation);
        return ReservationResponse.from(saved);
    }

    public ReservationResponse update(Long id, UserReservationUpdateRequest request) {
        Reservation reservation = reservationDao.findById(id);
        return update(id, request, new User(null, null, null, reservation.getName()));
    }

    public void delete(Long id) {
        reservationDao.delete(id);
    }

    private ReservationTime findReservationTime(Long timeId) {
        ReservationTime time = reservationTimeDao.findTimeById(timeId);
        if (time == null) {
            throw new IdNotFoundException("요청하신 시간 정보를 찾을 수 없습니다.");
        }
        return time;
    }

    private Theme findTheme(Long themeId) {
        Theme theme = themeDao.findThemeById(themeId);
        if (theme == null) {
            throw new IdNotFoundException("요청하신 테마 정보를 찾을 수 없습니다.");
        }
        return theme;
    }

    private void validateReservable(ReservationRequest request, ReservationTime time, Theme theme) {
        validateNotPast(request.date().atTime(time.getStartAt()));
        validateNotDuplicated(request.date(), theme, time);
    }

    private void validateReservable(UserReservationUpdateRequest request, ReservationTime time, Theme theme) {
        validateNotPast(request.date().atTime(time.getStartAt()));
        validateNotDuplicated(request.date(), theme, time);
    }

    private void validateNotPast(LocalDateTime targetDateTime) {
        if (targetDateTime.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("이미 지난 시간이나 날짜는 예약할 수 없습니다.");
        }
    }

    private void validateNotDuplicated(java.time.LocalDate date, Theme theme, ReservationTime time) {
        if (reservationDao.existsBy(date, theme, time)) {
            throw new IllegalArgumentException("이미 존재하는 예약입니다.");
        }
    }

    private void validateOwner(Reservation reservation, User user) {
        if (!reservation.getName().equals(user.getName())) {
            throw new AuthenticationException("본인의 예약만 변경할 수 있습니다.");
        }
    }
}
